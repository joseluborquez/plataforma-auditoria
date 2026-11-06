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

const clientSchema = z.object({ nombre: z.string().trim().min(1, "El nombre es obligatorio") });

export async function createClientAction(fd: FormData) {
  const { supabase } = await requireOwner();
  const { nombre } = clientSchema.parse({ nombre: fd.get("nombre") });
  const res = await supabase.from("clients").insert({
    nombre, rut: opt(fd.get("rut")), rubro: opt(fd.get("rubro")),
    rango_empleados: opt(fd.get("rango_empleados")), notas: opt(fd.get("notas")),
  }).select("id").single();
  check(res);
  revalidatePath("/clientes");
  redirect(`/clientes/${res.data!.id}`);
}

export async function updateClientAction(id: string, fd: FormData) {
  const { supabase } = await requireOwner();
  const { nombre } = clientSchema.parse({ nombre: fd.get("nombre") });
  check(await supabase.from("clients").update({
    nombre, rut: opt(fd.get("rut")), rubro: opt(fd.get("rubro")),
    rango_empleados: opt(fd.get("rango_empleados")), notas: opt(fd.get("notas")),
  }).eq("id", id));
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
}

export async function deleteClientAction(id: string) {
  const { supabase } = await requireOwner();
  check(await supabase.from("clients").delete().eq("id", id));
  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function createAreaAction(clientId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  const nombre = z.string().trim().min(1).parse(fd.get("nombre"));
  check(await supabase.from("areas").insert({ client_id: clientId, nombre }));
  revalidatePath(`/clientes/${clientId}`);
}

export async function deleteAreaAction(clientId: string, areaId: string) {
  const { supabase } = await requireOwner();
  check(await supabase.from("areas").delete().eq("id", areaId));
  revalidatePath(`/clientes/${clientId}`);
}

export async function setEncargadoAction(clientId: string, areaId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  check(await supabase.from("areas").update({ encargado_id: opt(fd.get("encargado_id")) }).eq("id", areaId));
  revalidatePath(`/clientes/${clientId}`);
}

export async function createPersonAction(clientId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  const nombre = z.string().trim().min(1, "El nombre es obligatorio").parse(fd.get("nombre"));
  const email = opt(fd.get("email"));
  if (email) z.string().email("Correo inválido").parse(email);
  const area_id = opt(fd.get("area_id"));
  const es_encargado = fd.get("es_encargado") === "on";
  const res = await supabase.from("people").insert({
    client_id: clientId, area_id, nombre, cargo: opt(fd.get("cargo")), email,
    telefono: opt(fd.get("telefono")), es_encargado,
  }).select("id").single();
  check(res);
  if (es_encargado && area_id) {
    check(await supabase.from("areas").update({ encargado_id: res.data!.id }).eq("id", area_id));
  }
  revalidatePath(`/clientes/${clientId}`);
}

export async function deletePersonAction(clientId: string, personId: string) {
  const { supabase } = await requireOwner();
  check(await supabase.from("people").delete().eq("id", personId));
  revalidatePath(`/clientes/${clientId}`);
}
