"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { check } from "@/lib/db";

const MAX_BYTES = 4 * 1024 * 1024;
const opt = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

export async function uploadDocumentAction(clientId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  const file = fd.get("archivo");
  if (!(file instanceof File) || file.size === 0) throw new Error("Selecciona un archivo.");
  if (file.size > MAX_BYTES) throw new Error("El archivo supera los 4 MB.");
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${clientId}/${randomUUID()}-${safe}`;
  const up = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || undefined });
  if (up.error) throw new Error(up.error.message);
  const ins = await supabase.from("documents").insert({
    client_id: clientId, area_id: opt(fd.get("area_id")), nombre: opt(fd.get("nombre")) ?? file.name,
    ruta_storage: path, confidencial: fd.get("confidencial") === "on",
  });
  if (ins.error) {
    await supabase.storage.from("documents").remove([path]); // no dejar huérfanos
    throw new Error(ins.error.message);
  }
  revalidatePath(`/clientes/${clientId}/documentos`);
}

export async function toggleConfidentialAction(clientId: string, docId: string, current: boolean) {
  const { supabase } = await requireOwner();
  check(await supabase.from("documents").update({ confidencial: !current }).eq("id", docId));
  revalidatePath(`/clientes/${clientId}/documentos`);
}

export async function deleteDocumentAction(clientId: string, docId: string, path: string) {
  const { supabase } = await requireOwner();
  check(await supabase.from("documents").delete().eq("id", docId));
  await supabase.storage.from("documents").remove([path]);
  revalidatePath(`/clientes/${clientId}/documentos`);
}
