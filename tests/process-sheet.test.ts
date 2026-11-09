import { describe, expect, it } from "vitest";
import { addUnique, EMPTY_FIELDS, sheetChecks, topValues } from "../lib/process-sheet";
import type { ProcessFields, ProcessStep } from "../lib/types";

const step = (o: Partial<ProcessStep>): ProcessStep => ({
  id: "s", process_id: "p", orden: 0, texto: "Paso", tipo: "accion", actor: null, herramienta: null,
  minutos_min: null, minutos_max: null, problema: false, nota: null, ...o,
});

describe("sheetChecks", () => {
  it("parte sin nada completo", () => {
    expect(sheetChecks([], EMPTY_FIELDS).every((c) => !c.done)).toBe(true);
  });
  it("marca cada punto cuando está cubierto", () => {
    const f: ProcessFields = {
      ...EMPTY_FIELDS, disparador: "Correo recibido", estado_datos: "dispersos",
      sipoc: { proveedores: [], entradas: ["Factura"], salidas: ["Pago"], clientes: [] },
    };
    const r = sheetChecks([step({ minutos_min: 5, minutos_max: 8 })], f);
    expect(r.map((c) => c.done)).toEqual([true, true, true, true, true]);
  });
  it("el tiempo también cuenta si ya hay una medición guardada", () => {
    expect(sheetChecks([], EMPTY_FIELDS).find((c) => c.key === "tiempo")?.done).toBe(false);
    expect(sheetChecks([], EMPTY_FIELDS, true).find((c) => c.key === "tiempo")?.done).toBe(true);
  });
  it("exige entradas Y salidas", () => {
    const f: ProcessFields = { ...EMPTY_FIELDS, sipoc: { proveedores: [], entradas: ["x"], salidas: [], clientes: [] } };
    expect(sheetChecks([], f).find((c) => c.key === "sipoc")?.done).toBe(false);
  });
});

describe("topValues", () => {
  it("ordena por repetición ignorando mayúsculas", () => {
    expect(topValues([["Contabilidad", "RRHH"], ["contabilidad"], ["Bodega"]], 2)).toEqual(["Contabilidad", "Bodega"]);
  });
  it("ignora vacíos", () => {
    expect(topValues([["", "  "]])).toEqual([]);
  });
});

describe("addUnique", () => {
  it("no repite ni agrega vacíos", () => {
    expect(addUnique(["Excel"], ["excel", " ", "Correo"])).toEqual(["Excel", "Correo"]);
  });
  it("respeta el máximo", () => {
    expect(addUnique(["a", "b"], ["c", "d"], 3)).toEqual(["a", "b", "c"]);
  });
});

describe("normalizeEjemplos", () => {
  it("completa con «pendiente» y descarta valores inválidos", async () => {
    const { normalizeEjemplos } = await import("../lib/process-sheet");
    expect(normalizeEjemplos(null)).toEqual({ entrada: "pendiente", salida: "pendiente", error: "pendiente" });
    expect(normalizeEjemplos({ entrada: "recibido", salida: "xx" as never })).toEqual({ entrada: "recibido", salida: "pendiente", error: "pendiente" });
  });
});
