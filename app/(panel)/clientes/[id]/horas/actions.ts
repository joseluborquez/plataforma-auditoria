"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";
import { todayISO } from "@/lib/format";

const activities = [
  "preparacion", "traslado", "reunion_inicio", "entrevista", "transcripcion_notas", "medicion_tiempos",
  "analisis", "mapa_procesos", "hoja_ruta", "presentacion", "comunicacion_cliente", "desarrollo_interno", "otro",
] as const;

const schema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  actividad: z.enum(activities),
  minutos: z.coerce.number().int().positive("Los minutos deben ser mayores a 0"),
});

export async function createTimeLogAction(clientId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  const horas = Number(fd.get("horas") || 0);
  const mins = Number(fd.get("minutos") || 0);
  const data = schema.parse({
    fecha: fd.get("fecha") || todayISO(), actividad: fd.get("actividad"),
    minutos: Math.round(horas * 60 + mins),
  });
  const detalle = typeof fd.get("detalle") === "string" ? (fd.get("detalle") as string).trim() || null : null;
  check(await supabase.from("time_log").insert({ client_id: clientId, ...data, detalle }));
  revalidatePath(`/clientes/${clientId}/horas`);
  revalidatePath("/horas");
}

export async function deleteTimeLogAction(clientId: string, logId: string) {
  const { supabase } = await requireOwner();
  check(await supabase.from("time_log").delete().eq("id", logId));
  revalidatePath(`/clientes/${clientId}/horas`);
  revalidatePath("/horas");
}
