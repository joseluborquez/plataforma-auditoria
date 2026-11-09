import { describe, expect, it } from "vitest";
import { formatRange, layoutSteps, summarize, timePatch, wrap } from "../lib/process-map";
import type { ProcessStep } from "../lib/types";

const step = (o: Partial<ProcessStep> & { orden: number }): ProcessStep => ({
  id: `s${o.orden}`, process_id: "p", texto: `Paso ${o.orden}`, tipo: "accion", actor: null, herramienta: null,
  minutos_min: null, minutos_max: null, problema: false, nota: null, ...o,
});

describe("wrap", () => {
  it("parte en líneas y recorta con puntos suspensivos", () => {
    expect(wrap("Revisar el correo y registrar la solicitud en la planilla", 22, 2)).toEqual(["Revisar el correo y", "registrar la solicitu…"]);
    expect(wrap("corto")).toEqual(["corto"]);
    expect(wrap("")).toEqual([]);
  });
  it("recorta palabras más largas que la línea", () => {
    expect(wrap("Anticonstitucionalmente", 10, 2)[0]).toHaveLength(10);
  });
});

describe("formatRange", () => {
  it("formatea rangos", () => {
    expect(formatRange(5, 10)).toBe("5–10 min");
    expect(formatRange(5, 5)).toBe("~5 min");
    expect(formatRange(null, 10)).toBe("hasta 10 min");
    expect(formatRange(2.5, null)).toBe("desde 2.5 min");
    expect(formatRange(null, null)).toBe("");
  });
});

describe("layoutSteps", () => {
  it("crea un carril por actor en orden de aparición y ordena por `orden`", () => {
    const l = layoutSteps([step({ orden: 2, actor: "Ana" }), step({ orden: 0, actor: "Luis" }), step({ orden: 1, actor: "Ana" })]);
    expect(l.lanes.map((x) => x.name)).toEqual(["Luis", "Ana"]);
    expect(l.nodes.map((n) => n.step.orden)).toEqual([0, 1, 2]);
    expect(l.nodes.map((n) => n.lane)).toEqual([0, 1, 1]);
    expect(l.edges).toHaveLength(2);
  });
  it("usa «Sin asignar» y une pasos del mismo carril con una línea recta", () => {
    const l = layoutSteps([step({ orden: 0 }), step({ orden: 1 })]);
    expect(l.lanes[0].name).toBe("Sin asignar");
    expect(l.edges[0].path).not.toContain("H");
  });
  it("cambia de carril con codo y marca «Sí» tras una decisión", () => {
    const l = layoutSteps([step({ orden: 0, actor: "A", tipo: "decision" }), step({ orden: 1, actor: "B" })]);
    expect(l.edges[0].path).toContain("H");
    expect(l.edges[0].label?.text).toBe("Sí");
  });
  it("sin pasos no falla", () => {
    const l = layoutSteps([]);
    expect(l.nodes).toEqual([]);
    expect(l.width).toBeGreaterThan(0);
  });
});

describe("summarize", () => {
  it("une herramientas, suma tiempos y lista problemas", () => {
    const r = summarize([
      step({ orden: 0, herramienta: "Excel", minutos_min: 5, minutos_max: 10, actor: "Ana" }),
      step({ orden: 1, herramienta: "Excel", minutos_min: 2, minutos_max: 4, problema: true }),
      step({ orden: 2, herramienta: "Correo" }),
    ]);
    expect(r.herramientas).toEqual(["Excel", "Correo"]);
    expect(r.actores).toEqual(["Ana"]);
    expect(r.minutosMin).toBe(7);
    expect(r.minutosMax).toBe(14);
    expect(r.problemas).toHaveLength(1);
    expect(r.sinTiempo).toBe(1);
  });
  it("sin tiempos devuelve null", () => {
    const r = summarize([step({ orden: 0 })]);
    expect(r.minutosMin).toBeNull();
    expect(r.minutosMax).toBeNull();
  });
});

describe("timePatch", () => {
  it("fija el valor y deja el otro como estaba", () => {
    expect(timePatch({ minutos_min: null, minutos_max: 10 }, "min", "5")).toEqual({ minutos_min: 5, minutos_max: 10 });
  });
  it("iguala el otro extremo si el rango quedaría al revés", () => {
    expect(timePatch({ minutos_min: 5, minutos_max: 10 }, "min", "20")).toEqual({ minutos_min: 20, minutos_max: 20 });
    expect(timePatch({ minutos_min: 5, minutos_max: 10 }, "max", "2")).toEqual({ minutos_min: 2, minutos_max: 2 });
  });
  it("vacío borra el valor; inválido se ignora", () => {
    expect(timePatch({ minutos_min: 5, minutos_max: 10 }, "max", "")).toEqual({ minutos_min: 5, minutos_max: null });
    expect(timePatch({ minutos_min: 5, minutos_max: 10 }, "max", "abc")).toBeNull();
    expect(timePatch({ minutos_min: 5, minutos_max: 10 }, "max", "-3")).toBeNull();
  });
});
