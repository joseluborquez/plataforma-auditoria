import { describe, expect, it } from "vitest";
import { compare, latest, weeklyMinutes, weeklyRange } from "@/lib/measurements";
import { suggestStage } from "@/lib/stage";
import { RUBRIC } from "@/lib/rubric";
import { CRITERIA_KEYS } from "@/lib/scoring";
import { impactOf, quadrantOf, suggestDecision } from "@/lib/scoring";
import { bucketOf, summarize } from "@/lib/hours";

describe("scoring", () => {
  it("impacto = suma de seis criterios", () => {
    expect(impactOf({ frecuencia_volumen: 1, tiempo: 1, repetitivo_reglas: 1, entradas_digitales: 1, errores_retrabajo: 1, quien_lo_asume: 1 })).toBe(6);
    expect(impactOf({ frecuencia_volumen: 5, tiempo: 5, repetitivo_reglas: 5, entradas_digitales: 5, errores_retrabajo: 5, quien_lo_asume: 5 })).toBe(30);
    expect(impactOf({ frecuencia_volumen: 4, tiempo: 5, repetitivo_reglas: 5, entradas_digitales: 3, errores_retrabajo: 4, quien_lo_asume: 4 })).toBe(25);
  });
  it("cuadrantes", () => {
    expect(quadrantOf(25, 2)).toBe("quick_win");
    expect(quadrantOf(25, 4)).toBe("estrategico");
    expect(quadrantOf(10, 1)).toBe("relleno");
    expect(quadrantOf(10, 5)).toBe("evitar");
  });
  it("sugerencia de decisión", () => {
    expect(suggestDecision(25, 2, false)).toBe("automatizar");
    expect(suggestDecision(25, 2, true)).toBe("integrar_ia");
    expect(suggestDecision(8, 1, false)).toBe("no_tocar");
    expect(suggestDecision(20, 5, false)).toBe("integrar_ia");
  });
});

describe("mediciones", () => {
  const base = { tipo: "linea_base" as const, minutos_por_vez: 240, veces_por_semana: 1, personas: 2, fecha: "2026-01-01" };
  const post = { tipo: "posterior" as const, minutos_por_vez: 60, veces_por_semana: 1, personas: 1, fecha: "2026-02-01" };
  it("minutos semanales", () => expect(weeklyMinutes(base)).toBe(480));
  it("compara base vs posterior", () => {
    const c = compare([base, post])!;
    expect(c.baseWeekly).toBe(480);
    expect(c.postWeekly).toBe(60);
    expect(c.diffMinutes).toBe(420);
    expect(c.diffPct).toBeCloseTo(87.5);
    expect(c.annualHoursSaved).toBeCloseTo(364);
  });
  it("sin posterior no hay comparación", () => expect(compare([base])).toBeNull());
  it("usa la medición más reciente", () => {
    const old = { ...base, fecha: "2025-12-01", minutos_por_vez: 999 };
    expect(latest([old, base], "linea_base")!.minutos_por_vez).toBe(240);
  });
  it("base 0 no divide por cero", () => {
    expect(compare([{ ...base, minutos_por_vez: 0 }, post])!.diffPct).toBeNull();
  });
});

describe("horas", () => {
  it("clasifica actividades", () => {
    expect(bucketOf("preparacion")).toBe("fija");
    expect(bucketOf("entrevista")).toBe("por_entrevista");
    expect(bucketOf("otro")).toBe("variable");
  });
  it("resume por actividad y cliente", () => {
    const r = summarize(
      [
        { client_id: "a", actividad: "preparacion", minutos: 60 },
        { client_id: "a", actividad: "entrevista", minutos: 120 },
        { client_id: "a", actividad: "traslado", minutos: 60 },
        { client_id: "a", actividad: "otro", minutos: 30 },
        { client_id: "b", actividad: "analisis", minutos: 90 },
      ],
      { a: 2 },
    );
    expect(r.total).toBe(360);
    expect(r.byActivity.entrevista).toBe(120);
    const a = r.byClient.find((c) => c.clientId === "a")!;
    expect(a).toMatchObject({ total: 270, fijas: 60, porEntrevista: 180, variables: 30, minPorEntrevista: 90 });
    expect(r.byClient.find((c) => c.clientId === "b")!.minPorEntrevista).toBeNull();
  });
});

import { coverageByArea } from "@/lib/coverage";
describe("cobertura de entrevistas", () => {
  it("elige el mejor estado por tipo", () => {
    const areas = [{ id: "a1", client_id: "c", nombre: "RRHH", encargado_id: null }, { id: "a2", client_id: "c", nombre: "Ops", encargado_id: null }];
    const cov = coverageByArea(areas, [
      { area_id: "a1", tipo: "encargado", estado: "pendiente" },
      { area_id: "a1", tipo: "encargado", estado: "realizada" },
      { area_id: "a1", tipo: "trabajador", estado: "agendada" },
    ]);
    expect(cov[0]).toMatchObject({ encargado: "realizada", trabajador: "agendada" });
    expect(cov[1]).toMatchObject({ encargado: null, trabajador: null });
  });
});

describe("método y rango de mediciones", () => {
  const base = { tipo: "linea_base" as const, minutos_por_vez: 60, veces_por_semana: 2, personas: 2, fecha: "2026-01-01" };
  const post = { tipo: "posterior" as const, minutos_por_vez: 10, veces_por_semana: 2, personas: 1, fecha: "2026-02-01" };
  it("rango semanal", () => {
    expect(weeklyRange({ ...base, minutos_min: 30, minutos_max: 90 })).toEqual([120, 360]);
    expect(weeklyRange(base)).toBeNull();
  });
  it("marca como declarada si alguna medición lo es", () => {
    expect(compare([base, post])!.declared).toBe(true); // sin metodo = declarado
    expect(compare([{ ...base, metodo: "cronometrado" as const }, { ...post, metodo: "registro_sistema" as const }])!.declared).toBe(false);
    expect(compare([{ ...base, metodo: "cronometrado" as const }, { ...post, metodo: "declarado" as const }])!.declared).toBe(true);
  });
});

describe("etapa del proceso", () => {
  it("sugiere según lo cargado", () => {
    expect(suggestStage({ pasos: [], problemas: null }, false, false)).toBe("identificado");
    expect(suggestStage({ pasos: ["a"], problemas: null }, false, false)).toBe("documentado");
    expect(suggestStage({ pasos: [], problemas: "x" }, true, false)).toBe("medido");
    expect(suggestStage({ pasos: [], problemas: null }, true, true)).toBe("puntuado");
  });
});

describe("rúbrica", () => {
  it("cubre los seis criterios de la puntuación", () => {
    expect(RUBRIC.map((r) => r.key).sort()).toEqual([...CRITERIA_KEYS].sort());
    for (const r of RUBRIC) expect([r.uno, r.tres, r.cinco].every((t) => t.length > 10)).toBe(true);
  });
});

import { assessRisk, controlsDone, RISK_QUESTIONS } from "@/lib/risk";
import { methodology } from "@/lib/methodology";
describe("riesgo de automatización", () => {
  const seguro = { datos_personales: false, decide_sobre_personas: false, supervision_humana: true, registro_trazabilidad: true, datos_salen_del_pais: false, plan_reversa: true, responsable_definido: true };
  it("bajo cuando hay controles y no hay datos sensibles", () => {
    expect(assessRisk(seguro).nivel).toBe("bajo");
  });
  it("alto si decide sobre personas sin supervisión humana", () => {
    const r = assessRisk({ ...seguro, decide_sobre_personas: true, supervision_humana: false });
    expect(r.nivel).toBe("alto");
    expect(r.acciones.length).toBeGreaterThan(0);
  });
  it("medio con varios factores moderados", () => {
    expect(assessRisk({ ...seguro, datos_personales: true, datos_salen_del_pais: true, plan_reversa: false }).nivel).toBe("medio");
  });
  it("usar IA suma puntaje", () => {
    expect(assessRisk(seguro, true).puntaje).toBe(assessRisk(seguro, false).puntaje + 1);
  });
  it("todo en contra es alto", () => {
    const peor = { datos_personales: true, decide_sobre_personas: true, supervision_humana: false, registro_trazabilidad: false, datos_salen_del_pais: true, plan_reversa: false, responsable_definido: false };
    expect(assessRisk(peor, true).nivel).toBe("alto");
  });
  it("cuenta controles cumplidos", () => {
    expect(controlsDone({ exactitud: true, autorizacion: false, cambios: true })).toBe(2);
    expect(controlsDone(null)).toBe(0);
  });
  it("las preguntas cubren todos los campos", () => {
    expect(RISK_QUESTIONS.map((q) => q.key).sort()).toEqual(Object.keys(seguro).sort());
  });
});
describe("metodología", () => {
  it("nombra al cliente, declara independencia y no certifica", () => {
    const t = JSON.stringify(methodology("Cliente X"));
    expect(t).toContain("Cliente X");
    expect(t).toContain("Independencia");
    expect(t).toContain("no constituye una certificación");
  });
});
