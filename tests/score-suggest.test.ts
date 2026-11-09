import { describe, expect, it } from "vitest";
import { scoreFrecuencia, scoreTiempo, suggestScores, type SuggestInput } from "../lib/score-suggest";
import type { ProcessStep } from "../lib/types";

const step = (o: Partial<ProcessStep> & { orden: number }): ProcessStep => ({
  id: `s${o.orden}`, process_id: "p", texto: `Paso ${o.orden}`, tipo: "accion", actor: null, herramienta: null,
  minutos_min: null, minutos_max: null, problema: false, nota: null, ...o,
});
const base: SuggestInput = {
  frecuencias: [], measurement: null, steps: [], fields: { estado_datos: null, excepciones: [] },
  problems: [], restricciones: [], aprueban: [], actores: [],
};
const get = (i: SuggestInput, k: string) => suggestScores(i).find((s) => s.key === k)!;

describe("umbrales", () => {
  it("frecuencia por semana", () => {
    expect([0.1, 0.25, 1, 2, 5].map(scoreFrecuencia)).toEqual([1, 2, 3, 4, 5]);
  });
  it("tiempo en horas por semana", () => {
    expect([0.5, 1, 4, 8, 16].map(scoreTiempo)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("suggestScores", () => {
  it("sin datos no inventa números", () => {
    const r = suggestScores(base);
    for (const k of ["frecuencia_volumen", "tiempo", "repetitivo_reglas", "entradas_digitales", "errores_retrabajo"]) {
      expect(r.find((s) => s.key === k)).toMatchObject({ value: null, evidence: "sin_datos" });
    }
  });
  it("usa la medición cuando existe", () => {
    const i = { ...base, measurement: { minutos_por_vez: 30, veces_por_semana: 5, personas: 2 } };
    expect(get(i, "frecuencia_volumen")).toMatchObject({ value: 5, evidence: "datos" });
    expect(get(i, "tiempo")).toMatchObject({ value: 3, evidence: "datos" }); // 30×5×2/60 = 5 h
  });
  it("sin medición estima desde el inventario y los pasos, y lo marca parcial", () => {
    const i = { ...base, frecuencias: ["semanal" as const, "diaria" as const], steps: [step({ orden: 0, minutos_min: 20, minutos_max: 40 }), step({ orden: 1, actor: "Ana" })] };
    expect(get(i, "frecuencia_volumen")).toMatchObject({ value: 5, evidence: "parcial" });
    expect(get(i, "tiempo")).toMatchObject({ value: 2, evidence: "parcial" }); // 30 min × 5 × 1 persona = 2,5 h
  });
  it("entradas digitales según el estado de los datos", () => {
    const f = (e: "estructurados" | "dispersos" | "en_papel") => get({ ...base, fields: { estado_datos: e, excepciones: [] } }, "entradas_digitales").value;
    expect([f("estructurados"), f("dispersos"), f("en_papel")]).toEqual([5, 3, 1]);
  });
  it("errores: cuenta problemas tipo error y pasos con ⚠", () => {
    const i = { ...base, problems: [{ tipo: "error" as const }, { tipo: "otro" as const }], steps: [step({ orden: 0, problema: true })] };
    expect(get(i, "errores_retrabajo")).toMatchObject({ value: 4, evidence: "datos" });
  });
  it("repetitivo baja con excepciones y decisiones", () => {
    const four = [step({ orden: 0 }), step({ orden: 1, tipo: "decision" }), step({ orden: 2 }), step({ orden: 3 })];
    // 3 excepciones restan 2; 1 decisión en 4 pasos (25 %) no llega al 30 % → 5 − 2 = 3
    expect(get({ ...base, steps: four, fields: { estado_datos: null, excepciones: ["a", "b", "c"] } }, "repetitivo_reglas").value).toBe(3);
    // sin excepciones pero con muchas decisiones (2 de 4 = 50 %) resta 1 → 4
    const many = [step({ orden: 0, tipo: "decision" }), step({ orden: 1, tipo: "decision" }), step({ orden: 2 }), step({ orden: 3 })];
    expect(get({ ...base, steps: many }, "repetitivo_reglas").value).toBe(4);
  });
  it("quién lo asume y esfuerzo son solo pistas", () => {
    const r = suggestScores({ ...base, actores: [{ nombre: "Ana", cargo: "Asistente" }], restricciones: ["Presupuesto"], steps: [step({ orden: 0 })] });
    expect(r.find((s) => s.key === "quien_lo_asume")).toMatchObject({ value: null, hintOnly: true });
    expect(r.find((s) => s.key === "quien_lo_asume")!.why[0]).toContain("Ana (Asistente)");
    expect(r.find((s) => s.key === "esfuerzo")).toMatchObject({ hintOnly: true });
  });
  it("riesgo legal solo se sugiere si se reportó", () => {
    expect(get({ ...base, problems: [{ tipo: "riesgo_legal" }] }, "riesgo_legal").value).toBe(true);
    expect(get(base, "riesgo_legal").value).toBeNull();
  });
});
