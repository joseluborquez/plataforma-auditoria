import { describe, expect, it } from "vitest";
import { draftEsfuerzoTexto, draftFase, draftPrioridad, draftRoadmapItem, draftTitulo } from "../lib/roadmap-draft";
import { appendLine, hasLine, mentionsPerson, removeLine } from "../lib/problems";

describe("draftFase", () => {
  it("sigue el cuadrante de la matriz", () => {
    expect(draftFase(22, 2)).toBe("quick_win");
    expect(draftFase(22, 4)).toBe("mediano_plazo");
    expect(draftFase(22, 5)).toBe("largo_plazo");
    expect(draftFase(10, 2)).toBe("mediano_plazo");
    expect(draftFase(10, 5)).toBe("largo_plazo");
  });
});

describe("draftPrioridad", () => {
  it("sube un nivel si fue la prioridad 1 de una entrevista", () => {
    expect(draftPrioridad(26, null)).toBe("alta");
    expect(draftPrioridad(18, null)).toBe("media");
    expect(draftPrioridad(8, null)).toBe("baja");
    expect(draftPrioridad(8, 1)).toBe("media");
    expect(draftPrioridad(18, 1)).toBe("alta");
    expect(draftPrioridad(26, 1)).toBe("alta");
    expect(draftPrioridad(18, 2)).toBe("media");
  });
});

describe("textos del borrador", () => {
  it("título según la decisión y esfuerzo en palabras", () => {
    expect(draftTitulo("Liquidaciones", "automatizar")).toBe("Automatizar: Liquidaciones");
    expect(draftTitulo("Liquidaciones", "integrar_ia")).toBe("Integrar IA en: Liquidaciones");
    expect(draftTitulo("Liquidaciones", null)).toBe("Mejorar: Liquidaciones");
    expect([1, 3, 4, 5].map(draftEsfuerzoTexto)).toEqual(["Hasta 1 semana", "2 a 4 semanas", "1 a 2 meses", "Más de 2 meses"]);
  });
  it("arma el ítem completo", () => {
    const d = draftRoadmapItem({ nombre: "Asistencia", impacto: 24, esfuerzo: 2, decision: "automatizar", prioridadEntrevista: 1 });
    expect(d).toMatchObject({ titulo: "Automatizar: Asistencia", fase: "quick_win", prioridad: "alta", esfuerzo_estimado: "Hasta 1 semana" });
    expect(d.notas).toContain("Prioridad dada en entrevista: 1");
  });
});

describe("líneas del reporte", () => {
  it("agrega con viñeta, sin repetir ni vaciar", () => {
    expect(appendLine(null, "Se digita dos veces")).toBe("• Se digita dos veces");
    expect(appendLine("• A", "B")).toBe("• A\n• B");
    expect(appendLine("• A", "  a  ")).toBe("• A");
    expect(appendLine("texto libre", "B")).toBe("texto libre\n• B");
  });
  it("respeta el máximo", () => {
    expect(appendLine("x".repeat(1995), "largo")).toBeNull();
  });
  it("detecta y quita la línea (con o sin viñeta)", () => {
    expect(hasLine("• A\n- B", "b")).toBe(true);
    expect(removeLine("• A\n• B", "A")).toBe("• B");
    expect(removeLine("• A", "A")).toBeNull();
  });
});

describe("mentionsPerson", () => {
  const names = ["Ana Pérez", "Luis Soto"];
  it("encuentra nombre completo, primer nombre o apellido, sin falsos positivos", () => {
    expect(mentionsPerson("Ana tarda en responder", names)).toBe("Ana");
    expect(mentionsPerson("Depende de luis soto", names)).toBe("Luis Soto");
    expect(mentionsPerson("Hay que analizar los datos", names)).toBeNull();
    expect(mentionsPerson("El área de Perez", names)).toBe("Pérez");
  });
  it("ignora tildes", () => {
    expect(mentionsPerson("Lo revisa ANA PEREZ siempre", names)).toBe("Ana Pérez");
  });
});
