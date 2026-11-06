import type { ProcessStage } from "./types";

export const STAGE_ORDER: ProcessStage[] = ["identificado", "documentado", "medido", "puntuado", "validado"];

/** Etapa sugerida según lo que ya está cargado. `validado` solo lo marca el dueño a mano. */
export function suggestStage(p: { pasos: unknown[]; problemas: string | null }, hasMeasurement: boolean, hasScore: boolean): ProcessStage {
  if (hasScore) return "puntuado";
  if (hasMeasurement) return "medido";
  if ((p.pasos?.length ?? 0) > 0 || (p.problemas ?? "").trim() !== "") return "documentado";
  return "identificado";
}
