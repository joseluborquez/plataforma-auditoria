import { describe, expect, it } from "vitest";
import { readiness, type ReadinessInput } from "../lib/readiness";
import type { Ejemplos, ProcessSource } from "../lib/types";

const src = (o: Partial<ProcessSource> = {}): ProcessSource => ({
  id: "s", process_id: "p", orden: 0, nombre: "Manual", formato: "documento", ubicacion: null, vigencia: "al_dia", ...o,
});
const ej = (o: Partial<Ejemplos> = {}): Ejemplos => ({ entrada: "pendiente", salida: "pendiente", error: "pendiente", ...o });
const base: ReadinessInput = { sources: [], toolsUsed: [], clientTools: [], ejemplos: ej(), casosPorMes: null };
const get = (i: ReadinessInput, k: string) => readiness(i).find((r) => r.key === k)!;

describe("conocimiento", () => {
  it("sin fuentes no está listo", () => {
    expect(get(base, "conocimiento")).toMatchObject({ done: false });
  });
  it("solo conocimiento tácito no cuenta y avisa", () => {
    const r = get({ ...base, sources: [src({ formato: "tacito" })] }, "conocimiento");
    expect(r.done).toBe(false);
    expect(r.detail).toContain("cabeza");
  });
  it("con fuentes documentadas está listo y cuenta las desactualizadas", () => {
    const r = get({ ...base, sources: [src(), src({ vigencia: "desactualizado" }), src({ formato: "tacito" })] }, "conocimiento");
    expect(r.done).toBe(true);
    expect(r.detail).toContain("2 fuente");
    expect(r.detail).toContain("1 desactualizada");
  });
});

describe("acceso", () => {
  it("sin herramientas pide indicarlas", () => {
    expect(get(base, "acceso").done).toBe(false);
  });
  it("todas con acceso conocido (sin distinguir mayúsculas) está listo", () => {
    const r = get({ ...base, toolsUsed: ["Excel", "excel", "Correo"], clientTools: [{ nombre: "EXCEL", acceso: "exporta", administra: null }, { nombre: "Correo", acceso: "api", administra: "TI" }] }, "acceso");
    expect(r.done).toBe(true);
    expect(r.detail).toContain("2/2");
  });
  it("«No sé» no cuenta como conocido y «solo manual» se avisa", () => {
    const r = get({ ...base, toolsUsed: ["Excel", "Papel"], clientTools: [{ nombre: "Excel", acceso: "no_se", administra: null }, { nombre: "Papel", acceso: "manual", administra: null }] }, "acceso");
    expect(r.done).toBe(false);
    expect(r.detail).toContain("1/2");
    expect(r.detail).toContain("Papel");
  });
});

describe("ejemplos", () => {
  it("exige entrada y salida; el caso con error es un extra", () => {
    expect(get({ ...base, ejemplos: ej({ entrada: "recibido", salida: "recibido" }), casosPorMes: 40 }, "ejemplos")).toMatchObject({ done: true });
    expect(get({ ...base, ejemplos: ej({ entrada: "recibido", error: "recibido" }) }, "ejemplos").done).toBe(false);
  });
  it("avisa si falta el volumen", () => {
    expect(get(base, "ejemplos").detail).toContain("volumen");
  });
});
