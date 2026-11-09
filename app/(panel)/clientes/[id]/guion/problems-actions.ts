"use server";

import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";

const uuid = z.string().uuid();
const blankToNull = (v: string) => (v === "" ? null : v);
const tipo = z.enum(["error", "dependencia", "riesgo_legal", "espera", "otro"]);

const problemSchema = z.object({
  id: uuid,
  process_id: uuid.nullable(),
  step_id: uuid.nullable(),
  tipo,
  texto: z.string().trim().min(1, "Escribe el problema").max(500),
  nota: z.string().trim().max(1000).transform(blankToNull).nullable(),
});
const patchSchema = problemSchema.omit({ id: true }).partial().strict();

async function ownInterview(clientId: string, interviewId: string) {
  const { supabase } = await requireOwner();
  uuid.parse(interviewId);
  const found = await supabase.from("interviews").select("id").eq("id", interviewId).eq("client_id", clientId).maybeSingle();
  check(found);
  if (!found.data) throw new Error("La entrevista no existe");
  return supabase;
}

type Db = Awaited<ReturnType<typeof ownInterview>>;

/** El proceso debe ser del cliente y el paso, del proceso elegido. */
async function validateLinks(supabase: Db, clientId: string, processId: string | null, stepId: string | null) {
  if (stepId && !processId) throw new Error("Elige primero el proceso del paso.");
  if (processId) {
    const p = await supabase.from("processes").select("id").eq("id", processId).eq("client_id", clientId).maybeSingle();
    check(p);
    if (!p.data) throw new Error("El proceso no existe");
  }
  if (stepId && processId) {
    const st = await supabase.from("process_steps").select("id").eq("id", stepId).eq("process_id", processId).maybeSingle();
    check(st);
    if (!st.data) throw new Error("El paso no pertenece a ese proceso");
  }
}

/** Idempotente: el id lo genera el navegador. */
export async function addProblemAction(clientId: string, interviewId: string, problem: unknown) {
  const supabase = await ownInterview(clientId, interviewId);
  const p = problemSchema.parse(problem);
  await validateLinks(supabase, clientId, p.process_id, p.step_id);
  check(await supabase.from("interview_problems").upsert({ ...p, interview_id: interviewId }, { onConflict: "id", ignoreDuplicates: true }));
}

export async function updateProblemAction(clientId: string, interviewId: string, problemId: string, patch: unknown) {
  const supabase = await ownInterview(clientId, interviewId);
  uuid.parse(problemId);
  const p = patchSchema.parse(patch);
  if (Object.keys(p).length === 0) return;
  if ("process_id" in p || "step_id" in p) {
    const cur = await supabase.from("interview_problems").select("process_id, step_id").eq("id", problemId).eq("interview_id", interviewId).maybeSingle();
    check(cur);
    const c = (cur.data ?? { process_id: null, step_id: null }) as { process_id: string | null; step_id: string | null };
    await validateLinks(supabase, clientId, "process_id" in p ? p.process_id ?? null : c.process_id, "step_id" in p ? p.step_id ?? null : c.step_id);
  }
  check(await supabase.from("interview_problems").update(p).eq("id", problemId).eq("interview_id", interviewId));
}

export async function removeProblemAction(clientId: string, interviewId: string, problemId: string) {
  const supabase = await ownInterview(clientId, interviewId);
  uuid.parse(problemId);
  check(await supabase.from("interview_problems").delete().eq("id", problemId).eq("interview_id", interviewId));
}
