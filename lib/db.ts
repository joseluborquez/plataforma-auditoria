type Res = { data: unknown; error: { message: string } | null };

/** Desenvuelve una respuesta de Supabase: lanza si hay error, devuelve [] si no hay datos. */
export function rows<T>(res: Res): T[] {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T[];
}

export function one<T>(res: Res): T | null {
  if (res.error) throw new Error(res.error.message);
  const d = res.data;
  return (Array.isArray(d) ? d[0] ?? null : d) as T | null;
}

export function check(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
}
