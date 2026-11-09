// Lógica pura del mapa de proceso: acomoda los pasos en carriles (uno por persona o rol) y resume lo que se puede calcular.
import type { ProcessStep } from "./types";

export const NODE_W = 150;
export const NODE_H = 64;
export const LANE_W = 190;
export const ROW_H = 100;
export const HEAD_H = 34;
export const PAD = 12;
export const NO_ACTOR = "Sin asignar";

export type Node = { step: ProcessStep; index: number; lane: number; cx: number; cy: number; lines: string[]; caption: string };
export type Edge = { path: string; label?: { x: number; y: number; text: string } };
export type Layout = { lanes: { name: string; x: number }[]; nodes: Node[]; edges: Edge[]; width: number; height: number };

/** Parte un texto en líneas de hasta `max` caracteres; recorta con «…» si no cabe. */
export function wrap(text: string, max = 22, maxLines = 2): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (let w of words) {
    if (w.length > max) w = w.slice(0, max - 1) + "…";
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= max) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1];
  kept[maxLines - 1] = (last.length >= max ? last.slice(0, max - 1) : last) + "…";
  return kept;
}

const trimNum = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
/** «5–10 min», «~5 min», «hasta 10 min» o «» si no hay tiempo. */
export function formatRange(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return min === max ? `~${trimNum(min)} min` : `${trimNum(min)}–${trimNum(max)} min`;
  if (min !== null) return `desde ${trimNum(min)} min`;
  if (max !== null) return `hasta ${trimNum(max)} min`;
  return "";
}

export const actorOf = (s: ProcessStep) => s.actor?.trim() || NO_ACTOR;

export function layoutSteps(input: ProcessStep[]): Layout {
  const steps = [...input].sort((a, b) => a.orden - b.orden);
  const laneNames: string[] = [];
  for (const s of steps) { const a = actorOf(s); if (!laneNames.includes(a)) laneNames.push(a); }
  const lanes = laneNames.map((name, i) => ({ name, x: PAD + LANE_W * i + LANE_W / 2 }));
  const nodes: Node[] = steps.map((step, index) => {
    const lane = laneNames.indexOf(actorOf(step));
    return {
      step, index, lane, cx: lanes[lane].x, cy: HEAD_H + PAD + ROW_H * index + NODE_H / 2,
      lines: wrap(step.texto, step.tipo === "decision" ? 16 : 22, 2),
      caption: [step.herramienta?.trim(), formatRange(step.minutos_min, step.minutos_max)].filter(Boolean).join(" · "),
    };
  });
  const edges: Edge[] = nodes.slice(0, -1).map((a, i) => {
    const b = nodes[i + 1];
    const y1 = a.cy + NODE_H / 2, y2 = b.cy - NODE_H / 2, mid = (y1 + y2) / 2;
    const path = a.cx === b.cx ? `M${a.cx},${y1} V${y2}` : `M${a.cx},${y1} V${mid} H${b.cx} V${y2}`;
    return { path, label: a.step.tipo === "decision" ? { x: a.cx + 8, y: y1 + 14, text: "Sí" } : undefined };
  });
  return {
    lanes, nodes, edges,
    width: Math.max(LANE_W, LANE_W * lanes.length) + PAD * 2,
    height: HEAD_H + PAD * 2 + (steps.length ? ROW_H * steps.length - (ROW_H - NODE_H) : 0),
  };
}

/** Lo que se puede calcular a partir de los pasos (para rellenar la ficha sin escribir de nuevo). */
export function summarize(input: ProcessStep[]) {
  const steps = [...input].sort((a, b) => a.orden - b.orden);
  const herramientas = [...new Set(steps.map((s) => s.herramienta?.trim()).filter((x): x is string => !!x))];
  const actores = [...new Set(steps.map((s) => s.actor?.trim()).filter((x): x is string => !!x))];
  const timed = steps.filter((s) => s.minutos_min !== null || s.minutos_max !== null);
  const minutosMin = timed.length ? timed.reduce((n, s) => n + (s.minutos_min ?? s.minutos_max ?? 0), 0) : null;
  const minutosMax = timed.length ? timed.reduce((n, s) => n + (s.minutos_max ?? s.minutos_min ?? 0), 0) : null;
  return {
    pasos: steps.map((s) => s.texto.trim()), herramientas, actores,
    problemas: steps.filter((s) => s.problema), minutosMin, minutosMax,
    sinTiempo: steps.length - timed.length,
  };
}
