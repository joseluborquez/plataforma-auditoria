import type { Activity, TimeLog } from "./types";

/** Fijas: se hacen una vez por auditoría. Por entrevista: crecen con cada entrevista. El resto es variable. */
export const FIXED: Activity[] = ["preparacion", "reunion_inicio", "analisis", "mapa_procesos", "hoja_ruta", "presentacion"];
export const PER_INTERVIEW: Activity[] = ["traslado", "entrevista", "transcripcion_notas"];

export type Bucket = "fija" | "por_entrevista" | "variable";
export function bucketOf(a: Activity): Bucket {
  if (FIXED.includes(a)) return "fija";
  if (PER_INTERVIEW.includes(a)) return "por_entrevista";
  return "variable";
}

export type ClientHours = {
  clientId: string;
  total: number; fijas: number; porEntrevista: number; variables: number;
  entrevistasRealizadas: number;
  /** Minutos de actividades por entrevista ÷ entrevistas realizadas. null si no hay entrevistas. */
  minPorEntrevista: number | null;
  byActivity: Partial<Record<Activity, number>>;
};

export function summarize(
  logs: Pick<TimeLog, "client_id" | "actividad" | "minutos">[],
  interviewsDone: Record<string, number> = {},
): { total: number; byActivity: Partial<Record<Activity, number>>; byClient: ClientHours[] } {
  const byActivity: Partial<Record<Activity, number>> = {};
  const clients = new Map<string, ClientHours>();
  let total = 0;
  for (const l of logs) {
    total += l.minutos;
    byActivity[l.actividad] = (byActivity[l.actividad] ?? 0) + l.minutos;
    let c = clients.get(l.client_id);
    if (!c) {
      c = {
        clientId: l.client_id, total: 0, fijas: 0, porEntrevista: 0, variables: 0,
        entrevistasRealizadas: interviewsDone[l.client_id] ?? 0, minPorEntrevista: null, byActivity: {},
      };
      clients.set(l.client_id, c);
    }
    c.total += l.minutos;
    c.byActivity[l.actividad] = (c.byActivity[l.actividad] ?? 0) + l.minutos;
    const b = bucketOf(l.actividad);
    if (b === "fija") c.fijas += l.minutos;
    else if (b === "por_entrevista") c.porEntrevista += l.minutos;
    else c.variables += l.minutos;
  }
  for (const c of clients.values()) {
    c.minPorEntrevista = c.entrevistasRealizadas > 0 ? c.porEntrevista / c.entrevistasRealizadas : null;
  }
  return { total, byActivity, byClient: [...clients.values()].sort((a, b) => b.total - a.total) };
}
