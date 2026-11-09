"use server";

import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";

const uuid = z.string().uuid();
const blankToNull = (v: string) => (v === "" ? null : v);

const sourceSchema = z.object({
  id: uuid,
  process_id: uuid,
  orden: z.number().int().min(0),
  nombre: z.string().trim().min(1, "La fuente necesita un nombre").max(200),
  formato: z.enum(["documento", "planilla", "correo", "sistema", "papel", "tacito"]),
  ubicacion: z.string().trim().max(200).transform(blankToNull).nullable(),
  vigencia: z.enum(["al_dia", "desactualizado", "no_se"]),
});
const sourcePatch = sourceSchema.omit({ id: true, process_id: true }).partial().strict();

const toolSchema = z.object({
  nombre: z.string().trim().min(1, "La herramienta necesita un nombre").max(100),
  acceso: z.enum(["api", "exporta", "manual", "no_se"]),
  administra: z.string().trim().max(200).transform(blankToNull).nullable(),
});

async function ownProcess(clientId: string, processId: string) {
  const { supabase } = await requireOwner();
  uuid.parse(processId);
  const found = await supabase.from("processes").select("id").eq("id", processId).eq("client_id", clientId).maybeSingle();
  check(found);
  if (!found.data) throw new Error("El proceso no existe");
  return supabase;
}

/** Idempotente: el id lo genera el navegador. */
export async function addSourceAction(clientId: string, source: unknown) {
  const s = sourceSchema.parse(source);
  const supabase = await ownProcess(clientId, s.process_id);
  check(await supabase.from("process_sources").upsert(s, { onConflict: "id", ignoreDuplicates: true }));
}

export async function updateSourceAction(clientId: string, processId: string, sourceId: string, patch: unknown) {
  const supabase = await ownProcess(clientId, processId);
  uuid.parse(sourceId);
  const p = sourcePatch.parse(patch);
  if (Object.keys(p).length === 0) return;
  check(await supabase.from("process_sources").update(p).eq("id", sourceId).eq("process_id", processId));
}

export async function removeSourceAction(clientId: string, processId: string, sourceId: string) {
  const supabase = await ownProcess(clientId, processId);
  uuid.parse(sourceId);
  check(await supabase.from("process_sources").delete().eq("id", sourceId).eq("process_id", processId));
}

/** Una herramienta se describe una vez por cliente (sin distinguir mayúsculas): se crea o se actualiza. */
export async function upsertToolAction(clientId: string, tool: unknown) {
  const { supabase } = await requireOwner();
  uuid.parse(clientId);
  const t = toolSchema.parse(tool);
  const found = await supabase.from("clients").select("id").eq("id", clientId).maybeSingle();
  check(found);
  if (!found.data) throw new Error("El cliente no existe");
  check(await supabase.from("client_tools").upsert({ client_id: clientId, ...t }, { onConflict: "client_id,nombre_key" }));
}
