import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as Role | null };
  const { data } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
  return { supabase, user, role: (data?.role ?? null) as Role | null };
}

/** Exige sesión de dueño. Un viewer es enviado al reporte. */
export async function requireOwner() {
  const s = await getSession();
  if (!s.user) redirect("/login");
  if (s.role !== "owner") redirect("/reporte");
  return { supabase: s.supabase, user: s.user };
}

/** Exige cualquier usuario con sesión (dueño o viewer). */
export async function requireUser() {
  const s = await getSession();
  if (!s.user) redirect("/login");
  return { supabase: s.supabase, user: s.user, role: s.role };
}
