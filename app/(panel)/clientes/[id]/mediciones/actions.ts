"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";
import { todayISO } from "@/lib/format";

const schema = z.object({
  process_id: z.string().uuid("Elige un proceso"),
  tipo: z.enum(["linea_base", "posterior"]),
  minutos_por_vez: z.coerce.number().min(0),
  veces_por_semana: z.coerce.number().min(0),
  personas: z.coerce.number().int().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  metodo: z.enum(["declarado", "cronometrado", "registro_sistema"]),
  minutos_min: z.coerce.number().min(0).nullable(),
  minutos_max: z.coerce.number().min(0).nullable(),
}).refine((d) => d.minutos_min == null || d.minutos_max == null || d.minutos_min <= d.minutos_max, {
  message: "El mínimo no puede ser mayor que el máximo",
});

const blank = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() !== "" ? v : null);

export async function createMeasurementAction(clientId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  const data = schema.parse({
    process_id: fd.get("process_id"), tipo: fd.get("tipo"), minutos_por_vez: fd.get("minutos_por_vez"),
    veces_por_semana: fd.get("veces_por_semana"), personas: fd.get("personas") || 1, fecha: fd.get("fecha") || todayISO(),
    metodo: fd.get("metodo") || "declarado", minutos_min: blank(fd.get("minutos_min")), minutos_max: blank(fd.get("minutos_max")),
  });
  const fuente = typeof fd.get("fuente") === "string" ? (fd.get("fuente") as string).trim() || null : null;
  check(await supabase.from("time_measurements").insert({ ...data, fuente }));
  check(await supabase.from("processes").update({ estado_proceso: "medido" })
    .eq("id", data.process_id).in("estado_proceso", ["identificado", "documentado"]));
  revalidatePath(`/clientes/${clientId}/mediciones`);
}

export async function deleteMeasurementAction(clientId: string, measurementId: string) {
  const { supabase } = await requireOwner();
  check(await supabase.from("time_measurements").delete().eq("id", measurementId));
  revalidatePath(`/clientes/${clientId}/mediciones`);
}
