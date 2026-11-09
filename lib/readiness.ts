// ¿Está listo el proceso para implementar una solución? Conocimiento, acceso a herramientas y ejemplos.
import type { ClientTool, Ejemplos, ProcessSource } from "./types";

export type ReadinessItem = { key: "conocimiento" | "acceso" | "ejemplos"; label: string; done: boolean; detail: string };

export const toolKey = (nombre: string) => nombre.trim().toLowerCase();

export type ReadinessInput = { sources: ProcessSource[]; toolsUsed: string[]; clientTools: ClientTool[]; ejemplos: Ejemplos; casosPorMes: number | null };

export function readiness(i: ReadinessInput): ReadinessItem[] {
  // Conocimiento
  const documented = i.sources.filter((s) => s.formato !== "tacito");
  const stale = documented.filter((s) => s.vigencia === "desactualizado").length;
  const conocimiento: ReadinessItem = i.sources.length === 0
    ? { key: "conocimiento", label: "Conocimiento", done: false, detail: "Sin fuentes registradas." }
    : documented.length === 0
      ? { key: "conocimiento", label: "Conocimiento", done: false, detail: "Solo está en la cabeza de alguien: hay que documentarlo antes de automatizar." }
      : { key: "conocimiento", label: "Conocimiento", done: true, detail: `${documented.length} fuente(s) documentada(s)${stale ? `, ${stale} desactualizada(s)` : ""}.` };

  // Acceso a las herramientas que usan los pasos
  const tools = [...new Map(i.toolsUsed.map((t) => [toolKey(t), t.trim()])).values()].filter(Boolean);
  const known = tools.filter((t) => { const c = i.clientTools.find((x) => toolKey(x.nombre) === toolKey(t)); return !!c && c.acceso !== "no_se"; });
  const manualOnly = tools.filter((t) => i.clientTools.find((x) => toolKey(x.nombre) === toolKey(t))?.acceso === "manual");
  const acceso: ReadinessItem = tools.length === 0
    ? { key: "acceso", label: "Acceso a sistemas", done: false, detail: "Indica la herramienta de cada paso del mapa." }
    : { key: "acceso", label: "Acceso a sistemas", done: known.length === tools.length,
        detail: `${known.length}/${tools.length} herramienta(s) con acceso conocido${manualOnly.length ? `; solo manual: ${manualOnly.join(", ")}` : ""}.` };

  // Ejemplos
  const got = (["entrada", "salida", "error"] as const).filter((k) => i.ejemplos[k] === "recibido").length;
  const ejemplos: ReadinessItem = {
    key: "ejemplos", label: "Ejemplos", done: i.ejemplos.entrada === "recibido" && i.ejemplos.salida === "recibido",
    detail: `${got}/3 recibidos${i.casosPorMes === null ? "; falta el volumen de casos por mes" : ""}.`,
  };
  return [conocimiento, acceso, ejemplos];
}
