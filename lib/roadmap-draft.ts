// Borrador de un ítem de hoja de ruta a partir de un proceso puntuado. Es un punto de partida: el dueño lo ajusta.
import { quadrantOf } from "./scoring";
import type { Decision, Phase, Priority } from "./types";

export type DraftInput = {
  nombre: string;
  impacto: number;
  esfuerzo: number;
  decision: Decision | null;
  /** Mejor prioridad (1 = la más alta) que dio alguna persona en las entrevistas. */
  prioridadEntrevista: number | null;
};

export function draftFase(impacto: number, esfuerzo: number): Phase {
  switch (quadrantOf(impacto, esfuerzo)) {
    case "quick_win": return "quick_win";
    case "estrategico": return esfuerzo >= 5 ? "largo_plazo" : "mediano_plazo";
    case "relleno": return "mediano_plazo";
    default: return "largo_plazo";
  }
}

export function draftPrioridad(impacto: number, prioridadEntrevista: number | null): Priority {
  const base = impacto >= 24 ? 2 : impacto >= 15 ? 1 : 0; // 0 baja · 1 media · 2 alta
  const boosted = prioridadEntrevista === 1 ? Math.min(2, base + 1) : base;
  return (["baja", "media", "alta"] as const)[boosted];
}

export function draftEsfuerzoTexto(esfuerzo: number): string {
  if (esfuerzo <= 2) return "Hasta 1 semana";
  if (esfuerzo === 3) return "2 a 4 semanas";
  if (esfuerzo === 4) return "1 a 2 meses";
  return "Más de 2 meses";
}

export function draftTitulo(nombre: string, decision: Decision | null): string {
  const verbo = decision === "automatizar" ? "Automatizar" : decision === "integrar_ia" ? "Integrar IA en" : "Mejorar";
  return `${verbo}: ${nombre}`;
}

export function draftRoadmapItem(i: DraftInput) {
  return {
    titulo: draftTitulo(i.nombre, i.decision),
    fase: draftFase(i.impacto, i.esfuerzo),
    prioridad: draftPrioridad(i.impacto, i.prioridadEntrevista),
    esfuerzo_estimado: draftEsfuerzoTexto(i.esfuerzo),
    notas: `Creado desde el proceso. Impacto ${i.impacto}/30, esfuerzo ${i.esfuerzo}/5${i.prioridadEntrevista ? `. Prioridad dada en entrevista: ${i.prioridadEntrevista}` : ""}.`,
  };
}
