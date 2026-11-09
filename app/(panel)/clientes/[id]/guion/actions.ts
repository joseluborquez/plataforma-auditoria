"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";

const uuid = z.string().uuid();
const keyRe = /^s\d+q\d+$/;

/** Verifica que la entrevista pertenezca al cliente (además de RLS). */
async function ownInterview(clientId: string, interviewId: string) {
  const { supabase } = await requireOwner();
  uuid.parse(interviewId);
  const found = await supabase.from("interviews").select("id, area_id").eq("id", interviewId).eq("client_id", clientId).maybeSingle();
  check(found);
  if (!found.data) throw new Error("La entrevista no existe");
  return { supabase, interview: found.data as { id: string; area_id: string | null } };
}

/** Guarda (o borra, si está vacía y no es «no aplica») la respuesta de una pregunta. */
export async function saveAnswerAction(clientId: string, interviewId: string, key: string, respuesta: string, noAplica: boolean) {
  const { supabase } = await ownInterview(clientId, interviewId);
  if (!keyRe.test(key)) throw new Error("Pregunta inválida");
  const text = respuesta.trim();
  if (!text && !noAplica) {
    check(await supabase.from("interview_answers").delete().eq("interview_id", interviewId).eq("pregunta_key", key));
    return;
  }
  check(await supabase.from("interview_answers").upsert({ interview_id: interviewId, pregunta_key: key, respuesta: text, no_aplica: noAplica }));
}

export async function toggleCheckAction(clientId: string, interviewId: string, itemKey: string, done: boolean) {
  const { supabase } = await ownInterview(clientId, interviewId);
  z.string().regex(/^(pre|post):\d+$/).parse(itemKey);
  if (done) check(await supabase.from("interview_checks").upsert({ interview_id: interviewId, item_key: itemKey, done: true }));
  else check(await supabase.from("interview_checks").delete().eq("interview_id", interviewId).eq("item_key", itemKey));
}

export async function saveTimingAction(clientId: string, interviewId: string, seccion: number, segundos: number) {
  const { supabase } = await ownInterview(clientId, interviewId);
  const s = z.object({ seccion: z.number().int().min(0).max(50), segundos: z.number().int().min(0).max(86400) }).parse({ seccion, segundos });
  check(await supabase.from("interview_timing").upsert({ interview_id: interviewId, seccion: s.seccion, segundos: s.segundos }));
}

/** Marca la entrevista como realizada; si hay tiempo medido, lo guarda como duración. */
export async function finishInterviewAction(clientId: string, interviewId: string, minutos: number | null) {
  const { supabase } = await ownInterview(clientId, interviewId);
  const patch: { estado: "realizada"; duracion_min?: number } = { estado: "realizada" };
  if (minutos && minutos > 0) patch.duracion_min = Math.min(Math.round(minutos), 1440);
  check(await supabase.from("interviews").update(patch).eq("id", interviewId));
  revalidatePath(`/clientes/${clientId}`, "layout");
}

/** Crea procesos «Identificado» a partir de lo hablado y los vincula a la entrevista. */
export async function createProcessesFromInterviewAction(clientId: string, interviewId: string, areaId: string, nombres: string[]) {
  const { supabase } = await ownInterview(clientId, interviewId);
  uuid.parse(areaId);
  const names = nombres.map((n) => n.trim()).filter(Boolean).slice(0, 50);
  if (names.length === 0) throw new Error("Escribe al menos una tarea.");
  const res = await supabase.from("processes").insert(names.map((nombre) => ({ client_id: clientId, area_id: areaId, nombre }))).select("id");
  check(res);
  const ids = (res.data ?? []) as { id: string }[];
  check(await supabase.from("interview_processes").upsert(ids.map((p) => ({ interview_id: interviewId, process_id: p.id }))));
  revalidatePath(`/clientes/${clientId}`, "layout");
}

export async function linkExistingProcessAction(clientId: string, interviewId: string, processId: string) {
  const { supabase } = await ownInterview(clientId, interviewId);
  uuid.parse(processId);
  check(await supabase.from("interview_processes").upsert({ interview_id: interviewId, process_id: processId }));
  revalidatePath(`/clientes/${clientId}`, "layout");
}

export async function unlinkProcessFromInterviewAction(clientId: string, interviewId: string, processId: string) {
  const { supabase } = await ownInterview(clientId, interviewId);
  uuid.parse(processId);
  check(await supabase.from("interview_processes").delete().eq("interview_id", interviewId).eq("process_id", processId));
  revalidatePath(`/clientes/${clientId}`, "layout");
}
