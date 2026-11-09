// Lógica pura de los problemas dichos en entrevista.
import type { InterviewProblem, ProblemType } from "./types";

export const PROBLEM_TYPES: ProblemType[] = ["error", "dependencia", "riesgo_legal", "espera", "otro"];

export function countByType(problems: Pick<InterviewProblem, "tipo">[]): Record<ProblemType, number> {
  const out: Record<ProblemType, number> = { error: 0, dependencia: 0, riesgo_legal: 0, espera: 0, otro: 0 };
  for (const p of problems) out[p.tipo]++;
  return out;
}

/** Problemas ligados a un proceso, y los generales (sin proceso). */
export function splitByProcess<T extends Pick<InterviewProblem, "process_id">>(problems: T[]) {
  const byProcess = new Map<string, T[]>();
  const general: T[] = [];
  for (const p of problems) {
    if (p.process_id) byProcess.set(p.process_id, [...(byProcess.get(p.process_id) ?? []), p]);
    else general.push(p);
  }
  return { byProcess, general };
}

/** Pistas para puntuar un proceso a partir de lo dicho en entrevistas. */
export function scoreHints(problems: Pick<InterviewProblem, "tipo">[]): string[] {
  const c = countByType(problems);
  const hints: string[] = [];
  if (c.error) hints.push(`${c.error} error(es) o retrabajo reportado(s): considéralo en «errores y retrabajo».`);
  if (c.riesgo_legal) hints.push(`${c.riesgo_legal} riesgo(s) legal(es) reportado(s): considera marcar «riesgo legal».`);
  if (c.dependencia) hints.push(`${c.dependencia} dependencia(s) de una persona: considéralo en «quién lo asume».`);
  if (c.espera) hints.push(`${c.espera} espera(s) de otros: puede alargar el tiempo del proceso.`);
  return hints;
}

/** Pistas a partir de lo que dijeron en las entrevistas sobre las condiciones del cambio. */
export function conditionHints(links: { prioridad: number | null; restricciones: string[] | null }[]): string[] {
  const hints: string[] = [];
  const restr = new Set(links.flatMap((l) => l.restricciones ?? []).map((r) => r.toLowerCase()));
  if (restr.size) hints.push(`${restr.size} restricción(es) mencionada(s): considéralo en «esfuerzo».`);
  if (links.some((l) => l.prioridad === 1)) hints.push("Una persona entrevistada lo eligió como su prioridad 1: puede pesar en el impacto.");
  return hints;
}

/* ───────── Líneas de «Problemas» que ve el cliente en el reporte ───────── */
const BULLET = /^\s*[•\-*]\s*/;
const norm = (s: string) => s.replace(BULLET, "").trim().toLowerCase().replace(/\s+/g, " ");

export function hasLine(text: string | null, line: string): boolean {
  return (text ?? "").split("\n").some((l) => norm(l) === norm(line) && norm(line) !== "");
}

/** Agrega el problema como una línea con viñeta. Devuelve null si no cabe en el máximo. Si ya está, no lo repite. */
export function appendLine(text: string | null, line: string, max = 2000): string | null {
  const clean = line.trim().replace(/\s+/g, " ");
  if (!clean) return text;
  if (hasLine(text, clean)) return text;
  const next = text?.trim() ? `${text.trim()}\n• ${clean}` : `• ${clean}`;
  return next.length > max ? null : next;
}

export function removeLine(text: string | null, line: string): string | null {
  const kept = (text ?? "").split("\n").filter((l) => norm(l) !== norm(line));
  const out = kept.join("\n").trim();
  return out === "" ? null : out;
}

const strip = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");
/** Si el texto nombra a una persona registrada (nombre completo, primer nombre o apellido), devuelve ese nombre. Sirve para no mostrar nombres al cliente. */
export function mentionsPerson(texto: string, names: string[]): string | null {
  const hay = strip(texto);
  for (const full of names) {
    const parts = full.trim().split(/\s+/);
    const candidates = [full.trim(), parts[0] ?? "", parts.length > 1 ? parts[parts.length - 1] : ""].filter((n, i) => strip(n).length >= (i === 2 ? 4 : 3));
    for (const c of candidates) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${strip(c).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu");
      if (re.test(hay)) return c;
    }
  }
  return null;
}
