"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";

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
