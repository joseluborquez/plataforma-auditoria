"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";

/** Guarda las respuestas del guion de una entrevista. Campos: `r_<clave>`; vacío = se borra la respuesta. */
export async function saveAnswersAction(clientId: string, interviewId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  z.string().uuid().parse(interviewId);
  const found = await supabase.from("interviews").select("id").eq("id", interviewId).eq("client_id", clientId).maybeSingle();
  check(found);
  if (!found.data) throw new Error("La entrevista no existe");

  const filled: { interview_id: string; pregunta_key: string; respuesta: string }[] = [];
  const empty: string[] = [];
  for (const [name, value] of fd.entries()) {
    if (!name.startsWith("r_") || typeof value !== "string") continue;
    const key = name.slice(2);
    if (!/^s\d+q\d+$/.test(key)) continue;
    const text = value.trim();
    if (text) filled.push({ interview_id: interviewId, pregunta_key: key, respuesta: text });
    else empty.push(key);
  }
  if (filled.length) check(await supabase.from("interview_answers").upsert(filled));
  if (empty.length) check(await supabase.from("interview_answers").delete().eq("interview_id", interviewId).in("pregunta_key", empty));
  revalidatePath(`/clientes/${clientId}/guion`);
}
