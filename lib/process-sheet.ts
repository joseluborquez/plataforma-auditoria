// Lógica pura de la ficha rápida del proceso.
import { summarize } from "./process-map";
import type { Freq, ProcessFields, ProcessStep, SipocLists } from "./types";

export const DISPARADORES = ["Correo recibido", "Fecha o plazo", "Solicitud verbal", "Falla o incidente", "Llega un documento"];
export const SIPOC_LISTS = [
  ["proveedores", "Proveedores", "¿De dónde vienen los datos o documentos?"],
  ["entradas", "Entradas", "Lo que se necesita para partir"],
  ["salidas", "Salidas", "Lo que se entrega al final"],
  ["clientes", "Clientes", "¿A quién se le entrega?"],
] as const satisfies readonly (readonly [keyof SipocLists, string, string])[];

/** Veces por semana sugeridas según la frecuencia declarada en el inventario. */
export const VECES_POR_FRECUENCIA: Record<Freq, number | null> = { diaria: 5, semanal: 1, mensual: 0.25, otra: null };

export const EMPTY_FIELDS: ProcessFields = {
  disparador: null, estado_datos: null, excepciones: [], problemas: null,
  sipoc: { proveedores: [], entradas: [], salidas: [], clientes: [] },
};

/** Qué falta para considerar «completa» la ficha de un proceso. */
export function sheetChecks(steps: ProcessStep[], f: ProcessFields) {
  const s = summarize(steps);
  return [
    { key: "disparador", label: "Disparador", done: !!f.disparador?.trim() },
    { key: "pasos", label: "Pasos", done: s.pasos.length > 0 },
    { key: "sipoc", label: "Entradas y salidas", done: f.sipoc.entradas.length > 0 && f.sipoc.salidas.length > 0 },
    { key: "datos", label: "Estado de los datos", done: !!f.estado_datos },
    { key: "tiempo", label: "Tiempo", done: s.minutosMin !== null },
  ];
}

/** Valores más repetidos (sin distinguir mayúsculas) para sugerir como chips. */
export function topValues(lists: string[][], limit = 10): string[] {
  const count = new Map<string, { label: string; n: number }>();
  for (const l of lists) for (const raw of l) {
    const label = raw.trim();
    if (!label) continue;
    const k = label.toLowerCase();
    const cur = count.get(k);
    if (cur) cur.n++; else count.set(k, { label, n: 1 });
  }
  return [...count.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "es")).slice(0, limit).map((x) => x.label);
}

/** Agrega valores a una lista sin repetir (ignora mayúsculas) y respetando un máximo. */
export function addUnique(list: string[], incoming: string[], max = 30): string[] {
  const out = [...list];
  for (const raw of incoming) {
    const v = raw.trim();
    if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase()) && out.length < max) out.push(v);
  }
  return out;
}
