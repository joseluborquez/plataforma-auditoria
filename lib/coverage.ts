import type { Area, Interview, InterviewStatus, InterviewType } from "./types";

const RANK: Record<InterviewStatus, number> = { pendiente: 1, agendada: 2, realizada: 3 };

export type Coverage = { area: Area; encargado: InterviewStatus | null; trabajador: InterviewStatus | null };

/** Para cada área, el mejor estado alcanzado por tipo de entrevista (null = falta crearla). */
export function coverageByArea(areas: Area[], interviews: Pick<Interview, "area_id" | "tipo" | "estado">[]): Coverage[] {
  const best = (areaId: string, tipo: InterviewType): InterviewStatus | null => {
    let out: InterviewStatus | null = null;
    for (const i of interviews) {
      if (i.area_id !== areaId || i.tipo !== tipo) continue;
      if (!out || RANK[i.estado] > RANK[out]) out = i.estado;
    }
    return out;
  };
  return areas.map((area) => ({ area, encargado: best(area.id, "encargado"), trabajador: best(area.id, "trabajador") }));
}

export const isMissing = (s: InterviewStatus | null) => s !== "realizada";
