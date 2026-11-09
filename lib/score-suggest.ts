// Puntaje sugerido a partir de lo capturado en entrevistas. Es una sugerencia con su razón: nunca se guarda sola.
import { summarize } from "./process-map";
import { VECES_POR_FRECUENCIA } from "./process-sheet";
import type { Freq, InterviewProblem, ProcessFields, ProcessStep } from "./types";

export type CriterionKey = "frecuencia_volumen" | "tiempo" | "repetitivo_reglas" | "entradas_digitales" | "errores_retrabajo" | "quien_lo_asume";
export type Evidence = "datos" | "parcial" | "sin_datos";
export type Suggestion = {
  key: CriterionKey | "esfuerzo" | "riesgo_legal";
  /** Número sugerido (1–5), o verdadero/falso para riesgo legal. null = solo hay una pista. */
  value: number | boolean | null;
  evidence: Evidence;
  /** Por qué se sugiere. */
  why: string[];
  /** true = la confianza es baja: se muestra la pista pero «Usar sugeridos» no la aplica. */
  hintOnly?: boolean;
};

export type SuggestInput = {
  frecuencias: Freq[];
  measurement: { minutos_por_vez: number; veces_por_semana: number; personas: number } | null;
  steps: ProcessStep[];
  fields: Pick<ProcessFields, "estado_datos" | "excepciones">;
  problems: Pick<InterviewProblem, "tipo">[];
  restricciones: string[];
  aprueban: string[];
  actores: { nombre: string; cargo: string | null }[];
};

const FREQ_ORDER: Freq[] = ["diaria", "semanal", "mensual", "otra"];
const FREQ_TEXT: Record<Freq, string> = { diaria: "cada día", semanal: "cada semana", mensual: "cada mes", otra: "otra frecuencia" };

export function scoreFrecuencia(vecesPorSemana: number): number {
  if (vecesPorSemana >= 5) return 5;
  if (vecesPorSemana >= 2) return 4;
  if (vecesPorSemana >= 1) return 3;
  if (vecesPorSemana >= 0.25) return 2;
  return 1;
}

export function scoreTiempo(horasPorSemana: number): number {
  if (horasPorSemana < 1) return 1;
  if (horasPorSemana < 4) return 2;
  if (horasPorSemana < 8) return 3;
  if (horasPorSemana < 16) return 4;
  return 5;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const uniq = (l: string[]) => [...new Set(l.map((x) => x.trim().toLowerCase()).filter(Boolean))];

export function suggestScores(i: SuggestInput): Suggestion[] {
  const out: Suggestion[] = [];
  const sum = summarize(i.steps);
  const topFreq = FREQ_ORDER.find((f) => i.frecuencias.includes(f)) ?? null;

  // Frecuencia / volumen
  if (i.measurement) {
    out.push({ key: "frecuencia_volumen", value: scoreFrecuencia(i.measurement.veces_por_semana), evidence: "datos",
      why: [`≈ ${round1(i.measurement.veces_por_semana)} veces por semana (medición)`] });
  } else if (topFreq && VECES_POR_FRECUENCIA[topFreq] !== null) {
    out.push({ key: "frecuencia_volumen", value: scoreFrecuencia(VECES_POR_FRECUENCIA[topFreq]!), evidence: "parcial",
      why: [`Declarada ${FREQ_TEXT[topFreq]} (inventario de la entrevista)`] });
  } else out.push({ key: "frecuencia_volumen", value: null, evidence: "sin_datos", why: ["Falta la frecuencia en el inventario o una medición."] });

  // Tiempo que consume
  if (i.measurement) {
    const m = i.measurement, horas = (m.minutos_por_vez * m.veces_por_semana * m.personas) / 60;
    out.push({ key: "tiempo", value: scoreTiempo(horas), evidence: "datos",
      why: [`${round1(horas)} h/semana = ${round1(m.minutos_por_vez)} min × ${round1(m.veces_por_semana)} veces × ${m.personas} persona(s) (medición)`] });
  } else if (sum.minutosMin !== null && sum.minutosMax !== null && topFreq && VECES_POR_FRECUENCIA[topFreq] !== null) {
    const porVez = (sum.minutosMin + sum.minutosMax) / 2, personas = Math.max(1, sum.actores.length), veces = VECES_POR_FRECUENCIA[topFreq]!;
    const horas = (porVez * veces * personas) / 60;
    out.push({ key: "tiempo", value: scoreTiempo(horas), evidence: "parcial",
      why: [`≈ ${round1(horas)} h/semana = ${round1(porVez)} min (pasos) × ${veces} veces × ${personas} persona(s). Falta guardar la medición.`] });
  } else out.push({ key: "tiempo", value: null, evidence: "sin_datos", why: ["Faltan el tiempo de los pasos y cada cuánto se hace."] });

  // Repetitivo y con reglas
  if (sum.pasos.length >= 3) {
    const exc = i.fields.excepciones.length, dec = i.steps.filter((s) => s.tipo === "decision").length;
    let v = 5;
    v -= exc === 0 ? 0 : exc <= 2 ? 1 : exc <= 4 ? 2 : 3;
    v -= dec / sum.pasos.length > 0.3 ? 1 : 0;
    out.push({ key: "repetitivo_reglas", value: Math.max(1, v), evidence: "parcial",
      why: [`${exc} excepción(es) anotada(s)`, `${dec} decisión(es) en ${sum.pasos.length} pasos`] });
  } else out.push({ key: "repetitivo_reglas", value: null, evidence: "sin_datos", why: ["Se necesitan al menos 3 pasos en el mapa."] });

  // Entradas digitales
  const est = i.fields.estado_datos;
  if (est) {
    out.push({ key: "entradas_digitales", value: est === "estructurados" ? 5 : est === "dispersos" ? 3 : 1, evidence: "datos",
      why: [`Datos ${est === "estructurados" ? "estructurados" : est === "dispersos" ? "dispersos" : est === "en_papel" ? "en papel" : "inexistentes"}`] });
  } else if (sum.herramientas.some((h) => /papel/i.test(h))) {
    out.push({ key: "entradas_digitales", value: 1, evidence: "parcial", why: ["Un paso usa papel. Falta indicar el estado de los datos."] });
  } else out.push({ key: "entradas_digitales", value: null, evidence: "sin_datos", why: ["Falta «Estado de los datos»."] });

  // Errores / retrabajo
  const errs = i.problems.filter((p) => p.tipo === "error").length + i.steps.filter((s) => s.problema).length;
  if (errs > 0) {
    out.push({ key: "errores_retrabajo", value: errs >= 3 ? 5 : errs === 2 ? 4 : 3, evidence: "datos",
      why: [`${errs} error(es), retrabajo o paso(s) con ⚠ reportado(s)`] });
  } else if (sum.pasos.length > 0 || i.frecuencias.length > 0) {
    out.push({ key: "errores_retrabajo", value: 1, evidence: "parcial", why: ["No se reportaron errores en las entrevistas (puede faltar preguntar)."] });
  } else out.push({ key: "errores_retrabajo", value: null, evidence: "sin_datos", why: ["No hay entrevistas con este proceso."] });

  // Quién lo asume: solo pista
  const quien = i.actores.filter((a) => a.nombre.trim());
  out.push({ key: "quien_lo_asume", value: null, evidence: quien.length ? "parcial" : "sin_datos", hintOnly: true,
    why: quien.length ? [`Lo hace: ${quien.map((a) => (a.cargo ? `${a.nombre} (${a.cargo})` : a.nombre)).join(", ")}`] : ["No se sabe quién lo hace: indícalo en los pasos."] });

  // Esfuerzo: solo pista
  const restr = uniq(i.restricciones), aprob = uniq(i.aprueban);
  const sistemas = i.steps.filter((s) => s.tipo === "sistema").length;
  const pts = Math.min(restr.length, 3) + (sum.herramientas.length > 3 ? 1 : 0) + (sistemas >= 2 ? 1 : 0) + (est === "en_papel" || est === "inexistentes" ? 1 : 0) + (aprob.length >= 2 ? 1 : 0);
  const hayDatos = restr.length > 0 || aprob.length > 0 || sum.pasos.length > 0;
  out.push({ key: "esfuerzo", value: hayDatos ? (pts <= 1 ? 2 : pts <= 3 ? 3 : pts === 4 ? 4 : 5) : null, evidence: hayDatos ? "parcial" : "sin_datos", hintOnly: true,
    why: hayDatos ? [`${restr.length} restricción(es), ${sum.herramientas.length} herramienta(s), ${sistemas} paso(s) en sistema, ${aprob.length} aprobador(es)`] : ["Faltan restricciones y herramientas."] });

  // Riesgo legal
  const legal = i.problems.filter((p) => p.tipo === "riesgo_legal").length;
  out.push({ key: "riesgo_legal", value: legal > 0 ? true : null, evidence: legal > 0 ? "datos" : "sin_datos",
    why: legal > 0 ? [`${legal} riesgo(s) legal(es) reportado(s) en entrevistas`] : ["No se reportaron riesgos legales."] });

  return out;
}

export const EVIDENCE_LABEL: Record<Evidence, string> = { datos: "Con datos", parcial: "Parcial", sin_datos: "Sin datos" };
