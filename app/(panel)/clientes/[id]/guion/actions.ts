"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";
import { isoToSantiagoLocal, todayISO } from "@/lib/format";
import type { Freq, InterviewTask } from "@/lib/types";

const uuid = z.string().uuid();
const keyRe = /^s\d+q\d+(:[0-9a-f-]{36})?$/;

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
  z.string().regex(/^((pre|post):\d+|s\d+q\d+)$/).parse(itemKey);
  if (done) check(await supabase.from("interview_checks").upsert({ interview_id: interviewId, item_key: itemKey, done: true }));
  else check(await supabase.from("interview_checks").delete().eq("interview_id", interviewId).eq("item_key", itemKey));
}

/** Guarda el tiempo total de la reunión (cronómetro general). Reemplaza los tiempos por sección que hubiera de antes. */
export async function saveTotalTimeAction(clientId: string, interviewId: string, segundos: number) {
  const { supabase } = await ownInterview(clientId, interviewId);
  const total = z.number().int().min(0).max(86400).parse(Math.round(segundos));
  check(await supabase.from("interview_timing").upsert({ interview_id: interviewId, seccion: 0, segundos: total }));
  check(await supabase.from("interview_timing").delete().eq("interview_id", interviewId).neq("seccion", 0));
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

/* ───────── Inventario rápido de tareas ───────── */
const freqSchema = z.enum(["diaria", "semanal", "mensual", "otra"]);
const blankToNull = (v: string) => (v === "" ? null : v);
const taskPatchSchema = z.object({
  nombre: z.string().trim().min(1, "La tarea necesita un nombre").max(200).optional(),
  frecuencia: freqSchema.nullable().optional(),
  quien_hace: z.string().trim().max(200).transform(blankToNull).nullable().optional(),
  pesa_tiempo: z.boolean().optional(),
  molesta_errores: z.boolean().optional(),
  nota: z.string().trim().max(2000).transform(blankToNull).nullable().optional(),
  para_detalle: z.boolean().optional(),
  prioridad: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable().optional(),
  idea: z.string().trim().max(1000).transform(blankToNull).nullable().optional(),
  restricciones: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  aprueba: z.string().trim().max(200).transform(blankToNull).nullable().optional(),
}).strict();

/** Crea procesos «Identificado» a partir de las tareas dichas y los vincula a la entrevista. Devuelve las filas creadas. */
export async function addTasksAction(clientId: string, interviewId: string, areaId: string, nombres: string[], frecuencia: Freq | null): Promise<InterviewTask[]> {
  const { supabase } = await ownInterview(clientId, interviewId);
  uuid.parse(areaId);
  const freq = frecuencia ? freqSchema.parse(frecuencia) : null;
  const names = nombres.map((n) => n.trim().slice(0, 200)).filter(Boolean).slice(0, 50);
  if (names.length === 0) throw new Error("Escribe al menos una tarea.");
  const res = await supabase.from("processes").insert(names.map((nombre) => ({ client_id: clientId, area_id: areaId, nombre }))).select("id, nombre, area_id");
  check(res);
  const created = (res.data ?? []) as { id: string; nombre: string; area_id: string }[];
  check(await supabase.from("interview_processes").upsert(created.map((p) => ({ interview_id: interviewId, process_id: p.id, frecuencia: freq }))));
  revalidatePath(`/clientes/${clientId}/procesos`);
  return created.map((p) => ({
    process_id: p.id, nombre: p.nombre, area_id: p.area_id, frecuencia: freq, quien_hace: null,
    pesa_tiempo: false, molesta_errores: false, nota: null, para_detalle: false,
    prioridad: null, idea: null, restricciones: [], aprueba: null,
  }));
}

export async function updateTaskAction(clientId: string, interviewId: string, processId: string, patch: unknown) {
  const { supabase } = await ownInterview(clientId, interviewId);
  uuid.parse(processId);
  const { nombre, ...rest } = taskPatchSchema.parse(patch);
  if (nombre) check(await supabase.from("processes").update({ nombre }).eq("id", processId).eq("client_id", clientId));
  if (Object.keys(rest).length) check(await supabase.from("interview_processes").update(rest).eq("interview_id", interviewId).eq("process_id", processId));
}

/** Quita la tarea de la entrevista. El proceso solo se borra si nadie más lo usa (otra entrevista, mediciones, puntaje, hoja de ruta). */
export async function removeTaskAction(clientId: string, interviewId: string, processId: string): Promise<{ deleted: boolean }> {
  const { supabase } = await ownInterview(clientId, interviewId);
  uuid.parse(processId);
  const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const r = await q; check(r); return r.count ?? 0;
  };
  const head = { count: "exact" as const, head: true };
  const [others, meas, scores, roadmap, proc] = await Promise.all([
    count(supabase.from("interview_processes").select("process_id", head).eq("process_id", processId).neq("interview_id", interviewId)),
    count(supabase.from("time_measurements").select("id", head).eq("process_id", processId)),
    count(supabase.from("scores").select("process_id", head).eq("process_id", processId)),
    count(supabase.from("roadmap_items").select("id", head).eq("process_id", processId)),
    supabase.from("processes").select("estado_proceso").eq("id", processId).eq("client_id", clientId).maybeSingle(),
  ]);
  check(proc);
  check(await supabase.from("interview_processes").delete().eq("interview_id", interviewId).eq("process_id", processId));
  const unused = others + meas + scores + roadmap === 0 && (proc.data as { estado_proceso: string } | null)?.estado_proceso === "identificado";
  if (unused) check(await supabase.from("processes").delete().eq("id", processId).eq("client_id", clientId));
  revalidatePath(`/clientes/${clientId}/procesos`);
  return { deleted: unused };
}

/** Condiciones del cambio que valen para toda el área (restricciones y quién aprueba). */
export async function updateAreaConditionsAction(clientId: string, interviewId: string, patch: unknown) {
  const { supabase } = await ownInterview(clientId, interviewId);
  const p = z.object({
    restricciones: z.array(z.string().trim().min(1).max(100)).max(20),
    aprueba: z.string().trim().max(200).transform(blankToNull).nullable(),
  }).partial().strict().parse(patch);
  if (Object.keys(p).length === 0) return;
  check(await supabase.from("interviews").update(p).eq("id", interviewId).eq("client_id", clientId));
}

/** Registra la duración de la reunión en Horas (actividad «entrevista»). Si ya estaba registrada, la actualiza en vez de duplicarla. */
export async function logInterviewHoursAction(clientId: string, interviewId: string, segundos: number) {
  const { supabase } = await ownInterview(clientId, interviewId);
  const minutos = Math.max(1, Math.round(z.number().min(0).max(86400).parse(segundos) / 60));
  const iv = await supabase.from("interviews").select("tipo, fecha_hora, person_id, area_id").eq("id", interviewId).maybeSingle();
  check(iv);
  const row = iv.data as { tipo: string; fecha_hora: string | null; person_id: string | null; area_id: string | null } | null;
  if (!row) throw new Error("La entrevista no existe");
  const [person, area] = await Promise.all([
    row.person_id ? supabase.from("people").select("nombre").eq("id", row.person_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    row.area_id ? supabase.from("areas").select("nombre").eq("id", row.area_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  check(person); check(area);
  const fecha = row.fecha_hora ? isoToSantiagoLocal(row.fecha_hora).slice(0, 10) : todayISO();
  const detalle = [`Entrevista a ${row.tipo === "encargado" ? "encargado" : "trabajador"}`, (person.data as { nombre: string } | null)?.nombre, (area.data as { nombre: string } | null)?.nombre]
    .filter(Boolean).join(" · ");
  const found = await supabase.from("time_log").select("id").eq("client_id", clientId).eq("actividad", "entrevista").eq("fecha", fecha).eq("detalle", detalle).maybeSingle();
  check(found);
  if (found.data) check(await supabase.from("time_log").update({ minutos }).eq("id", (found.data as { id: string }).id));
  else check(await supabase.from("time_log").insert({ client_id: clientId, fecha, actividad: "entrevista", minutos, detalle }));
  revalidatePath(`/clientes/${clientId}/horas`);
  revalidatePath("/horas");
  return { minutos, actualizado: !!found.data };
}
