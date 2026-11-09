import { describe, expect, it } from "vitest";
import { conditionHints, countByType, scoreHints, splitByProcess } from "../lib/problems";

const p = (tipo: "error" | "dependencia" | "riesgo_legal" | "espera" | "otro", process_id: string | null = null) => ({ tipo, process_id });

describe("countByType", () => {
  it("cuenta por tipo e incluye los que no aparecen", () => {
    expect(countByType([p("error"), p("error"), p("espera")])).toEqual({ error: 2, dependencia: 0, riesgo_legal: 0, espera: 1, otro: 0 });
  });
});

describe("splitByProcess", () => {
  it("separa los ligados a un proceso de los generales", () => {
    const r = splitByProcess([p("error", "a"), p("otro"), p("espera", "a"), p("error", "b")]);
    expect(r.byProcess.get("a")).toHaveLength(2);
    expect(r.byProcess.get("b")).toHaveLength(1);
    expect(r.general).toHaveLength(1);
  });
});

describe("scoreHints", () => {
  it("sin problemas no hay pistas", () => {
    expect(scoreHints([])).toEqual([]);
  });
  it("sugiere según el tipo", () => {
    const h = scoreHints([p("error"), p("riesgo_legal"), p("dependencia")]);
    expect(h).toHaveLength(3);
    expect(h[0]).toContain("errores y retrabajo");
    expect(h[1]).toContain("riesgo legal");
    expect(h[2]).toContain("quién lo asume");
  });
});

describe("conditionHints", () => {
  it("sin datos no hay pistas", () => {
    expect(conditionHints([{ prioridad: null, restricciones: [] }])).toEqual([]);
  });
  it("cuenta restricciones distintas e indica la prioridad 1", () => {
    const h = conditionHints([{ prioridad: 1, restricciones: ["Presupuesto", "Equipos"] }, { prioridad: 2, restricciones: ["presupuesto"] }]);
    expect(h[0]).toContain("2 restricción");
    expect(h[1]).toContain("prioridad 1");
  });
});
