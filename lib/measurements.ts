import type { Measurement } from "./types";

type M = Pick<Measurement, "tipo" | "minutos_por_vez" | "veces_por_semana" | "personas" | "fecha">;

/** Minutos por semana de toda la organización = minutos por vez × veces por semana × personas. */
export function weeklyMinutes(m: Pick<M, "minutos_por_vez" | "veces_por_semana" | "personas">): number {
  return m.minutos_por_vez * m.veces_por_semana * m.personas;
}

/** Medición más reciente de un tipo (por fecha). */
export function latest<T extends M>(list: T[], tipo: M["tipo"]): T | null {
  const sorted = list.filter((m) => m.tipo === tipo).sort((a, b) => b.fecha.localeCompare(a.fecha));
  return sorted[0] ?? null;
}

export type Comparison = {
  baseWeekly: number;
  postWeekly: number;
  diffMinutes: number; // positivo = ahorro
  diffPct: number | null; // null si la línea base es 0
  annualHoursSaved: number;
};

export function compare(list: M[]): Comparison | null {
  const base = latest(list, "linea_base");
  const post = latest(list, "posterior");
  if (!base || !post) return null;
  const baseWeekly = weeklyMinutes(base);
  const postWeekly = weeklyMinutes(post);
  const diffMinutes = baseWeekly - postWeekly;
  return {
    baseWeekly,
    postWeekly,
    diffMinutes,
    diffPct: baseWeekly === 0 ? null : (diffMinutes / baseWeekly) * 100,
    annualHoursSaved: (diffMinutes * 52) / 60,
  };
}
