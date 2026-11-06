import type { Decision, Score } from "./types";

export const CRITERIA_KEYS = [
  "frecuencia_volumen", "tiempo", "repetitivo_reglas",
  "entradas_digitales", "errores_retrabajo", "quien_lo_asume",
] as const;

export const IMPACT_MIN = 6;
export const IMPACT_MAX = 30;
/** Umbrales de la matriz: impacto alto desde 18; esfuerzo alto desde 4. */
export const HIGH_IMPACT = 18;
export const HIGH_EFFORT = 4;

type Criteria = Pick<Score, (typeof CRITERIA_KEYS)[number]>;

/** Impacto = suma de los seis criterios (6 a 30). */
export function impactOf(c: Criteria): number {
  return CRITERIA_KEYS.reduce((sum, k) => sum + c[k], 0);
}

export type Quadrant = "quick_win" | "estrategico" | "relleno" | "evitar";
export const QUADRANT_LABEL: Record<Quadrant, string> = {
  quick_win: "Quick win (alto impacto, bajo esfuerzo)",
  estrategico: "Proyecto estratégico (alto impacto, alto esfuerzo)",
  relleno: "Relleno (bajo impacto, bajo esfuerzo)",
  evitar: "Evitar (bajo impacto, alto esfuerzo)",
};

export function quadrantOf(impacto: number, esfuerzo: number): Quadrant {
  const highImpact = impacto >= HIGH_IMPACT;
  const highEffort = esfuerzo >= HIGH_EFFORT;
  if (highImpact) return highEffort ? "estrategico" : "quick_win";
  return highEffort ? "evitar" : "relleno";
}

/** Sugerencia (no vinculante): el dueño decide. El riesgo legal evita automatizar sin revisión. */
export function suggestDecision(impacto: number, esfuerzo: number, riesgoLegal: boolean): Decision {
  if (impacto < 12) return "no_tocar";
  if (riesgoLegal) return "integrar_ia";
  if (impacto >= HIGH_IMPACT && esfuerzo <= 3) return "automatizar";
  return "integrar_ia";
}
