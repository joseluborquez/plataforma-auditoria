"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";
import { draftRoadmapItem } from "@/lib/roadmap-draft";
import type { Decision } from "@/lib/types";

const opt = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};
const schema = z.object({
  titulo: z.string().trim().min(1, "El título es obligatorio"),
  fase: z.enum(["quick_win", "mediano_plazo", "largo_plazo"]),
  prioridad: z.enum(["alta", "media", "baja"]),
  estado: z.enum(["pendiente", "en_curso", "hecho", "descartado"]),
});

function parse(fd: FormData) {
  const base = schema.parse({ titulo: fd.get("titulo"), fase: fd.get("fase"), prioridad: fd.get("prioridad"), estado: fd.get("estado") ?? "pendiente" });
  return { ...base, process_id: opt(fd.get("process_id")), esfuerzo_estimado: opt(fd.get("esfuerzo_estimado")), notas: opt(fd.get("notas")) };
}

export async function createRoadmapAction(clientId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  check(await supabase.from("roadmap_items").insert({ client_id: clientId, ...parse(fd) }));
  revalidatePath(`/clientes/${clientId}/hoja-de-ruta`);
}

export async function updateRoadmapAction(clientId: string, itemId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  check(await supabase.from("roadmap_items").update(parse(fd)).eq("id", itemId));
  revalidatePath(`/clientes/${clientId}/hoja-de-ruta`);
}

export async function deleteRoadmapAction(clientId: string, itemId: string) {
  const { supabase } = await requireOwner();
  check(await supabase.from("roadmap_items").delete().eq("id", itemId));
  revalidatePath(`/clientes/${clientId}/hoja-de-ruta`);
}

/** Crea un ítem de hoja de ruta a partir de un proceso puntuado (fase, prioridad y esfuerzo se proponen; se ajustan después). No duplica. */
export async function createRoadmapFromProcessAction(clientId: string, processId: string) {
  const { supabase } = await requireOwner();
  z.string().uuid().parse(processId);
  const proc = await supabase.from("processes").select("id, nombre").eq("id", processId).eq("client_id", clientId).maybeSingle();
  check(proc);
  if (!proc.data) throw new Error("El proceso no existe");
  const existing = await supabase.from("roadmap_items").select("id").eq("process_id", processId).limit(1);
  check(existing);
  if ((existing.data ?? []).length > 0) return;
  const score = await supabase.from("scores").select("impacto, esfuerzo, decision").eq("process_id", processId).maybeSingle();
  check(score);
  if (!score.data) throw new Error("Puntúa el proceso antes de crear el ítem.");
  const sc = score.data as { impacto: number; esfuerzo: number; decision: Decision | null };
  if (sc.decision === "no_tocar") throw new Error("La decisión de este proceso es «no tocar»: no se crea ítem.");
  const links = await supabase.from("interview_processes").select("prioridad").eq("process_id", processId);
  check(links);
  const prios = ((links.data ?? []) as { prioridad: number | null }[]).flatMap((l) => (l.prioridad ? [l.prioridad] : []));
  const draft = draftRoadmapItem({
    nombre: (proc.data as { nombre: string }).nombre, impacto: sc.impacto, esfuerzo: sc.esfuerzo, decision: sc.decision,
    prioridadEntrevista: prios.length ? Math.min(...prios) : null,
  });
  check(await supabase.from("roadmap_items").insert({ client_id: clientId, process_id: processId, estado: "pendiente", ...draft }));
  revalidatePath(`/clientes/${clientId}/hoja-de-ruta`);
  revalidatePath(`/clientes/${clientId}/procesos/${processId}`);
}
