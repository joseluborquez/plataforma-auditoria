"use server";

import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";

const uuid = z.string().uuid();
const blankToNull = (v: string) => (v === "" ? null : v);
const minutes = z.number().min(0).max(100000).nullable();

const stepSchema = z.object({
  id: uuid,
  process_id: uuid,
  orden: z.number().int().min(0),
  texto: z.string().trim().min(1, "El paso necesita un texto").max(300),
  tipo: z.enum(["accion", "decision", "espera", "sistema"]),
  actor: z.string().trim().max(100).transform(blankToNull).nullable(),
  herramienta: z.string().trim().max(100).transform(blankToNull).nullable(),
  minutos_min: minutes,
  minutos_max: minutes,
  problema: z.boolean(),
  nota: z.string().trim().max(1000).transform(blankToNull).nullable(),
}).refine((s) => s.minutos_min === null || s.minutos_max === null || s.minutos_min <= s.minutos_max, "El mínimo no puede superar al máximo");

const patchSchema = z.object({
  texto: stepSchema.shape.texto,
  tipo: stepSchema.shape.tipo,
  actor: stepSchema.shape.actor,
  herramienta: stepSchema.shape.herramienta,
  minutos_min: minutes,
  minutos_max: minutes,
  problema: z.boolean(),
  nota: stepSchema.shape.nota,
}).partial().strict();

type Db = Awaited<ReturnType<typeof requireOwner>>["supabase"];

/** Mantiene la ficha al día con los pasos: pasos, herramientas y la columna «Proceso» del SIPOC se calculan solos. */
async function syncFromSteps(supabase: Db, processId: string) {
  const r = await supabase.from("process_steps").select("texto, herramienta").eq("process_id", processId).order("orden");
  check(r);
  const steps = (r.data ?? []) as { texto: string; herramienta: string | null }[];
  const pasos = steps.map((x) => x.texto.trim());
  const herramientas = [...new Set(steps.map((x) => x.herramienta?.trim()).filter((x): x is string => !!x))];
  const cur = await supabase.from("processes").select("sipoc").eq("id", processId).maybeSingle();
  check(cur);
  const sipoc = { ...((cur.data as { sipoc: Record<string, string[]> } | null)?.sipoc ?? {}), proceso: pasos };
  check(await supabase.from("processes").update({ pasos, herramientas, sipoc }).eq("id", processId));
}

async function ownProcess(clientId: string, processId: string) {
  const { supabase } = await requireOwner();
  uuid.parse(processId);
  const found = await supabase.from("processes").select("id").eq("id", processId).eq("client_id", clientId).maybeSingle();
  check(found);
  if (!found.data) throw new Error("El proceso no existe");
  return supabase;
}

/** Idempotente: el id lo genera el navegador, así un reintento no duplica el paso. */
export async function addStepAction(clientId: string, step: unknown) {
  const s = stepSchema.parse(step);
  const supabase = await ownProcess(clientId, s.process_id);
  check(await supabase.from("process_steps").upsert(s, { onConflict: "id", ignoreDuplicates: true }));
  await syncFromSteps(supabase, s.process_id);
}

export async function updateStepAction(clientId: string, processId: string, stepId: string, patch: unknown) {
  const supabase = await ownProcess(clientId, processId);
  uuid.parse(stepId);
  const p = patchSchema.parse(patch);
  if (Object.keys(p).length === 0) return;
  check(await supabase.from("process_steps").update(p).eq("id", stepId).eq("process_id", processId));
  if ("texto" in p || "herramienta" in p) await syncFromSteps(supabase, processId);
}

export async function removeStepAction(clientId: string, processId: string, stepId: string) {
  const supabase = await ownProcess(clientId, processId);
  uuid.parse(stepId);
  check(await supabase.from("process_steps").delete().eq("id", stepId).eq("process_id", processId));
  await syncFromSteps(supabase, processId);
}

/** Renumera los pasos según el orden recibido (ids de arriba hacia abajo). */
export async function reorderStepsAction(clientId: string, processId: string, ids: string[]) {
  const supabase = await ownProcess(clientId, processId);
  const list = z.array(uuid).max(200).parse(ids);
  const results = await Promise.all(list.map((id, orden) => supabase.from("process_steps").update({ orden }).eq("id", id).eq("process_id", processId)));
  for (const r of results) check(r);
  await syncFromSteps(supabase, processId);
}
