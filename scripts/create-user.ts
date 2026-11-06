/**
 * Crea un usuario (dueño o viewer). Solo para uso local: requiere SUPABASE_SERVICE_ROLE_KEY.
 * Uso:
 *   npx tsx --env-file=.env.local scripts/create-user.ts <email> <owner|viewer> [clientId] [areaId]
 * La contraseña se pide por la variable USER_PASSWORD (no queda en el historial del shell si la exportas antes).
 */
import { createClient } from "@supabase/supabase-js";

const [email, role, clientId, areaId] = process.argv.slice(2);
const password = process.env.USER_PASSWORD;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || (role !== "owner" && role !== "viewer") || !password || !url || !key) {
  console.error("Uso: USER_PASSWORD=... npx tsx --env-file=.env.local scripts/create-user.ts <email> <owner|viewer> [clientId] [areaId]");
  console.error("Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
if (role === "viewer" && !clientId) {
  console.error("Un viewer necesita clientId (y opcionalmente areaId; sin areaId el alcance es global).");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error || !data.user) {
  console.error("Error creando usuario:", error?.message);
  process.exit(1);
}
const uid = data.user.id;

const upd = await admin.from("profiles").update({ role }).eq("user_id", uid);
if (upd.error) { console.error("Error asignando rol:", upd.error.message); process.exit(1); }

if (role === "viewer") {
  const ins = await admin.from("viewers").insert({ user_id: uid, client_id: clientId, area_id: areaId ?? null });
  if (ins.error) { console.error("Error asignando alcance:", ins.error.message); process.exit(1); }
}
console.log(`Usuario ${email} creado como ${role}${role === "viewer" ? ` (alcance: ${areaId ? "área " + areaId : "global"})` : ""}.`);
