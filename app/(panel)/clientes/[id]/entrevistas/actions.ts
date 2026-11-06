"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";
import { santiagoLocalToISO } from "@/lib/format";

const opt = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

const schema = z.object({
  tipo: z.enum(["encargado", "trabajador"]),
  estado: z.enum(["pendiente", "agendada", "realizada"]),
  duracion_min: z.coerce.number().int().positive().nullable(),
});

function parse(fd: FormData) {
  const dur = opt(fd.get("duracion_min"));
  const base = schema.parse({ tipo: fd.get("tipo"), estado: fd.get("estado"), duracion_min: dur });
  const local = opt(fd.get("fecha_hora"));
  return {
    ...base,
    area_id: opt(fd.get("area_id")),
    person_id: opt(fd.get("person_id")),
    fecha_hora: local ? santiagoLocalToISO(local) : null,
    resumen: opt(fd.get("resumen")),
  };
}

export async function createInterviewAction(clientId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  check(await supabase.from("interviews").insert({ client_id: clientId, ...parse(fd) }));
  revalidatePath(`/clientes/${clientId}/entrevistas`);
}

export async function updateInterviewAction(clientId: string, interviewId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  check(await supabase.from("interviews").update(parse(fd)).eq("id", interviewId));
  // Notas privadas: tabla separada (solo dueño).
  const notas = typeof fd.get("notas_privadas") === "string" ? (fd.get("notas_privadas") as string) : "";
  check(await supabase.from("interview_notes").upsert({ interview_id: interviewId, notas_privadas: notas }));
  revalidatePath(`/clientes/${clientId}/entrevistas`);
}

export async function deleteInterviewAction(clientId: string, interviewId: string) {
  const { supabase } = await requireOwner();
  check(await supabase.from("interviews").delete().eq("id", interviewId));
  revalidatePath(`/clientes/${clientId}/entrevistas`);
}

export async function linkProcessAction(clientId: string, interviewId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  const process_id = z.string().uuid("Elige un proceso").parse(fd.get("process_id"));
  check(await supabase.from("interview_processes").upsert({ interview_id: interviewId, process_id }));
  revalidatePath(`/clientes/${clientId}`, "layout");
}

export async function unlinkProcessAction(clientId: string, interviewId: string, processId: string) {
  const { supabase } = await requireOwner();
  check(await supabase.from("interview_processes").delete().eq("interview_id", interviewId).eq("process_id", processId));
  revalidatePath(`/clientes/${clientId}`, "layout");
}
