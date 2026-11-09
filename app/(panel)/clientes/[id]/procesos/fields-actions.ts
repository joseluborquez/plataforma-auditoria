"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";
import { todayISO } from "@/lib/format";
import { summarize } from "@/lib/process-map";
import type { ProcessStep } from "@/lib/types";

const uuid = z.string().uuid();
const blankToNull = (v: string) => (v === "" ? null : v);
const list = z.array(z.string().trim().min(1).max(100)).max(30).transform((l) => l.filter((x, i) => l.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i));

const exampleState = z.enum(["pendiente", "pedido", "recibido"]);

const fieldsSchema = z.object({
  disparador: z.string().trim().max(200).transform(blankToNull).nullable(),
  estado_datos: z.enum(["estructurados", "dispersos", "en_papel", "inexistentes"]).nullable(),
  excepciones: list,
  problemas: z.string().trim().max(2000).transform(blankToNull).nullable(),
  casos_por_mes: z.number().min(0).max(1e9).nullable(),
  ejemplos: z.object({ entrada: exampleState, salida: exampleState, error: exampleState }).partial().strict(),
  sipoc: z.object({ proveedores: list, entradas: list, salidas: list, clientes: list }).partial().strict(),
}).partial().strict();

async function ownProcess(clientId: string, processId: string) {
  const { supabase } = await requireOwner();
  uuid.parse(processId);
  const found = await supabase.from("processes").select("id, sipoc, ejemplos").eq("id", processId).eq("client_id", clientId).maybeSingle();
  check(found);
  if (!found.data) throw new Error("El proceso no existe");
  const row = found.data as { sipoc: Record<string, string[]> | null; ejemplos: Record<string, string> | null };
  return { supabase, sipoc: (row.sipoc ?? {}) as Record<string, string[]>, ejemplos: row.ejemplos ?? {} };
}

/** Guarda campos de la ficha rápida. En SIPOC solo reemplaza las listas recibidas; «Proceso» lo calcula el mapa. */
export async function updateProcessFieldsAction(clientId: string, processId: string, patch: unknown) {
  const { supabase, sipoc, ejemplos } = await ownProcess(clientId, processId);
  const { sipoc: sipocPatch, ejemplos: ejemplosPatch, ...rest } = fieldsSchema.parse(patch);
  const update: Record<string, unknown> = { ...rest };
  if (sipocPatch && Object.keys(sipocPatch).length) update.sipoc = { ...sipoc, ...sipocPatch };
  if (ejemplosPatch && Object.keys(ejemplosPatch).length) update.ejemplos = { ...ejemplos, ...ejemplosPatch };
  if (Object.keys(update).length === 0) return;
  check(await supabase.from("processes").update(update).eq("id", processId).eq("client_id", clientId));
}

const measSchema = z.object({
  veces_por_semana: z.number().min(0).max(1000),
  personas: z.number().int().min(1).max(1000),
  metodo: z.enum(["declarado", "cronometrado", "registro_sistema"]),
  // Solo se usa si ningún paso tiene tiempo: el total que dice la persona, sin desglosar por paso.
  total_min: z.number().min(0).max(100000).nullable().optional(),
  total_max: z.number().min(0).max(100000).nullable().optional(),
});

/** Guarda como medición el tiempo total que suman los pasos (mínimo y máximo). */
export async function saveStepsMeasurementAction(clientId: string, processId: string, input: unknown) {
  const { supabase } = await ownProcess(clientId, processId);
  const m = measSchema.parse(input);
  const r = await supabase.from("process_steps").select("*").eq("process_id", processId).order("orden");
  check(r);
  const sum = summarize((r.data ?? []) as ProcessStep[]);
  let min = sum.minutosMin, max = sum.minutosMax;
  if (min === null || max === null) {
    const tm = m.total_min ?? null, tx = m.total_max ?? null;
    if (tm === null && tx === null) throw new Error("Anota el tiempo de los pasos o escribe el total.");
    min = tm ?? tx; max = tx ?? tm;
    if (min! > max!) throw new Error("El mínimo no puede ser mayor que el máximo.");
  }
  const porVez = (min! + max!) / 2;
  check(await supabase.from("time_measurements").insert({
    process_id: processId, tipo: "linea_base", minutos_por_vez: porVez, veces_por_semana: m.veces_por_semana, personas: m.personas,
    fecha: todayISO(), metodo: m.metodo, minutos_min: min, minutos_max: max, fuente: sum.minutosMin === null ? "Total declarado" : "Mapa del proceso",
  }));
  check(await supabase.from("processes").update({ estado_proceso: "medido" }).eq("id", processId).in("estado_proceso", ["identificado", "documentado"]));
  revalidatePath(`/clientes/${clientId}/mediciones`);
  return { min: min!, max: max! };
}
