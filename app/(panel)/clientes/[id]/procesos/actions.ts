"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";

const opt = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};
const lines = (v: FormDataEntryValue | null) =>
  (typeof v === "string" ? v : "").split("\n").map((s) => s.trim()).filter(Boolean);
const commas = (v: FormDataEntryValue | null) =>
  (typeof v === "string" ? v : "").split(",").map((s) => s.trim()).filter(Boolean);

export async function createProcessAction(clientId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  const nombre = z.string().trim().min(1, "El nombre es obligatorio").parse(fd.get("nombre"));
  const area_id = z.string().uuid("Elige un área").parse(fd.get("area_id"));
  const res = await supabase.from("processes").insert({ client_id: clientId, area_id, nombre }).select("id").single();
  check(res);
  revalidatePath(`/clientes/${clientId}/procesos`);
  redirect(`/clientes/${clientId}/procesos/${res.data!.id}`);
}

export async function inventoryAction(clientId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  const area_id = z.string().uuid("Elige un área").parse(fd.get("area_id"));
  const nombres = lines(fd.get("tareas")).slice(0, 50);
  if (nombres.length === 0) throw new Error("Escribe al menos una tarea (una por línea).");
  check(await supabase.from("processes").insert(nombres.map((nombre) => ({ client_id: clientId, area_id, nombre }))));
  revalidatePath(`/clientes/${clientId}/procesos`);
}

export async function linkInterviewAction(clientId: string, processId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  const interview_id = z.string().uuid().parse(fd.get("interview_id"));
  check(await supabase.from("interview_processes").upsert({ interview_id, process_id: processId }));
  revalidatePath(`/clientes/${clientId}`, "layout");
}

export async function updateProcessAction(clientId: string, pid: string, fd: FormData) {
  const { supabase } = await requireOwner();
  const nombre = z.string().trim().min(1, "El nombre es obligatorio").parse(fd.get("nombre"));
  const area_id = z.string().uuid().parse(fd.get("area_id"));
  const estado = opt(fd.get("estado_datos"));
  const estado_datos = estado ? z.enum(["estructurados", "dispersos", "en_papel", "inexistentes"]).parse(estado) : null;
  const estado_proceso = z.enum(["identificado", "documentado", "medido", "puntuado", "validado"]).parse(fd.get("estado_proceso") ?? "identificado");
  check(await supabase.from("processes").update({
    nombre, area_id, estado_proceso, responsable: opt(fd.get("responsable")), disparador: opt(fd.get("disparador")),
    pasos: lines(fd.get("pasos")), herramientas: commas(fd.get("herramientas")),
    problemas: opt(fd.get("problemas")), estado_datos, evidencia: opt(fd.get("evidencia")),
    sipoc: {
      proveedores: lines(fd.get("sipoc_proveedores")), entradas: lines(fd.get("sipoc_entradas")),
      proceso: lines(fd.get("sipoc_proceso")), salidas: lines(fd.get("sipoc_salidas")),
      clientes: lines(fd.get("sipoc_clientes")),
    },
  }).eq("id", pid));
  revalidatePath(`/clientes/${clientId}`, "layout");
}

const score = z.coerce.number().int().min(1).max(5);
export async function saveScoreAction(clientId: string, pid: string, fd: FormData) {
  const { supabase } = await requireOwner();
  const dec = opt(fd.get("decision"));
  check(await supabase.from("scores").upsert({
    process_id: pid,
    frecuencia_volumen: score.parse(fd.get("frecuencia_volumen")),
    tiempo: score.parse(fd.get("tiempo")),
    repetitivo_reglas: score.parse(fd.get("repetitivo_reglas")),
    entradas_digitales: score.parse(fd.get("entradas_digitales")),
    errores_retrabajo: score.parse(fd.get("errores_retrabajo")),
    quien_lo_asume: score.parse(fd.get("quien_lo_asume")),
    riesgo_legal: fd.get("riesgo_legal") === "on",
    esfuerzo: score.parse(fd.get("esfuerzo")),
    decision: dec ? z.enum(["automatizar", "integrar_ia", "no_tocar"]).parse(dec) : null,
  }));
  // Avanza la etapa a «Puntuado» sin retroceder un proceso ya puntuado o validado.
  check(await supabase.from("processes").update({ estado_proceso: "puntuado" })
    .eq("id", pid).in("estado_proceso", ["identificado", "documentado", "medido"]));
  revalidatePath(`/clientes/${clientId}`, "layout");
}

export async function deleteProcessAction(clientId: string, pid: string) {
  const { supabase } = await requireOwner();
  check(await supabase.from("processes").delete().eq("id", pid));
  revalidatePath(`/clientes/${clientId}`, "layout");
  redirect(`/clientes/${clientId}/procesos`);
}
