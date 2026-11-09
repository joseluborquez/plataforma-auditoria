"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { EXAMPLE_STATE, SOURCE_FORMAT, TOOL_ACCESS, VIGENCIA } from "@/lib/labels";
import { toolKey } from "@/lib/readiness";
import type { ClientTool, Ejemplos, ExampleState, FieldsPatch, ProcessSource, SourceFormat, ToolAccess, Vigencia } from "@/lib/types";
import type { ReadinessApi } from "@/components/use-readiness";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FORMATS = Object.keys(SOURCE_FORMAT) as SourceFormat[];
const VIGENCIAS = Object.keys(VIGENCIA) as Vigencia[];
const ACCESOS = Object.keys(TOOL_ACCESS) as ToolAccess[];
const STATES = Object.keys(EXAMPLE_STATE) as ExampleState[];
const UBICACIONES = ["Google Drive", "Carpeta compartida", "Correo", "Servidor", "Sistema propio", "Escritorio de alguien", "Papel / archivador"];
const EJEMPLOS: { key: keyof Ejemplos; label: string }[] = [
  { key: "entrada", label: "Ejemplos de entrada (lo que llega)" },
  { key: "salida", label: "Ejemplos de salida (lo que se entrega)" },
  { key: "error", label: "Casos con error o excepción" },
];

function Chip({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} title={label} onClick={onClick}
      className={cn("rounded-md border px-2 py-1 text-xs transition-colors", on ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
      {children}
    </button>
  );
}
const inputCls = "h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring";

/** Lo que hace falta saber para implementar una automatización o una IA: conocimiento, acceso a herramientas y ejemplos. */
export function ReadinessBlock({ clientId, processId, sources, toolsUsed, clientTools, fields, api, onFields }: {
  clientId: string; processId: string; sources: ProcessSource[]; toolsUsed: string[]; clientTools: ClientTool[];
  fields: { casos_por_mes: number | null; ejemplos: Ejemplos }; api: ReadinessApi; onFields: (p: FieldsPatch, delay?: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const [formato, setFormato] = useState<SourceFormat>("documento");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const tools = [...new Map(toolsUsed.map((t) => [toolKey(t), t.trim()])).values()].filter(Boolean);

  function add(text: string) {
    for (const l of text.split("\n").map((x) => x.trim()).filter(Boolean)) api.addSource(processId, l, formato);
    setDraft(""); addRef.current?.focus();
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div><h3 className="text-sm font-medium">¿De dónde sale el conocimiento?</h3>
          <p className="text-xs text-muted-foreground">Documentos, planillas o saberes que la persona usa para hacerlo. Es la base de una IA que responda con la información de la empresa.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={addRef} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={200} aria-label="Nueva fuente de conocimiento"
            placeholder="Ej.: Manual de remuneraciones, planilla de turnos…"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }}
            onPaste={(e) => { const t = e.clipboardData.getData("text"); if (t.includes("\n")) { e.preventDefault(); add(t); } }}
            className="h-9 min-w-56 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
          <select aria-label="Formato de las nuevas fuentes" value={formato} onChange={(e) => setFormato(e.target.value as SourceFormat)} className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm">
            {FORMATS.map((f) => <option key={f} value={f} className="bg-card">{SOURCE_FORMAT[f]}</option>)}
          </select>
          <Button onClick={() => add(draft)} disabled={!draft.trim()}>Agregar</Button>
        </div>
        <datalist id={`ubic-${processId}`}>{UBICACIONES.map((u) => <option key={u} value={u} />)}</datalist>
        {sources.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Aún no hay fuentes. Pregunta: «¿qué documentos o planillas usa para hacerlo?»</p>
        ) : (
          <ul className="space-y-2">
            {sources.map((s) => (
              <li key={s.id} className={cn("space-y-2 rounded-lg border p-2.5", s.formato === "tacito" && "border-destructive/50")}>
                <div className="flex items-center gap-2">
                  <input key={s.id} defaultValue={s.nombre} maxLength={200} aria-label="Nombre de la fuente"
                    onChange={(e) => { if (e.target.value.trim()) api.patchSource(processId, s.id, { nombre: e.target.value }, 800); }}
                    onBlur={(e) => { if (!e.target.value.trim()) e.target.value = s.nombre; }}
                    className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm font-medium outline-none hover:border-input focus-visible:border-ring" />
                  {confirmId === s.id ? (
                    <span className="flex items-center gap-1 text-xs">¿Quitar?
                      <Button size="xs" variant="destructive" onClick={() => { api.removeSource(processId, s.id); setConfirmId(null); }}>Sí</Button>
                      <Button size="xs" variant="outline" onClick={() => setConfirmId(null)}>No</Button>
                    </span>
                  ) : <button type="button" aria-label="Quitar fuente" title="Quitar" className="px-1 text-xs text-muted-foreground hover:text-destructive" onClick={() => setConfirmId(s.id)}>✕</button>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <select aria-label="Formato" value={s.formato} onChange={(e) => api.patchSource(processId, s.id, { formato: e.target.value as SourceFormat })} className={cn(inputCls, "w-48")}>
                    {FORMATS.map((f) => <option key={f} value={f} className="bg-card">{SOURCE_FORMAT[f]}</option>)}
                  </select>
                  {s.formato !== "tacito" && (
                    <input list={`ubic-${processId}`} value={s.ubicacion ?? ""} maxLength={200} aria-label="Dónde está" placeholder="¿Dónde está?"
                      onChange={(e) => api.patchSource(processId, s.id, { ubicacion: e.target.value }, 800)} className={cn(inputCls, "w-44")} />
                  )}
                  <span className="ml-auto flex items-center gap-1">
                    {VIGENCIAS.map((v) => <Chip key={v} on={s.vigencia === v} label={`Vigencia: ${VIGENCIA[v]}`} onClick={() => api.patchSource(processId, s.id, { vigencia: v })}>{VIGENCIA[v]}</Chip>)}
                  </span>
                </div>
                {s.formato === "tacito" && <p className="text-xs text-destructive">Solo la sabe una persona: documentarlo es el primer paso antes de automatizar.</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div><h3 className="text-sm font-medium">Herramientas y acceso</h3>
          <p className="text-xs text-muted-foreground">Decide si se puede conectar directamente o si hay que partir de archivos y correos. Se describe una vez por cliente.</p></div>
        {tools.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Aparecerán las herramientas que indiques en los pasos del mapa.</p>
        ) : (
          <ul className="space-y-2">
            {tools.map((t) => {
              const c = clientTools.find((x) => toolKey(x.nombre) === toolKey(t));
              return (
                <li key={toolKey(t)} className="space-y-2 rounded-lg border p-2.5">
                  <p className="text-sm font-medium">{t}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ACCESOS.map((a) => <Chip key={a} on={(c?.acceso ?? "no_se") === a} label={TOOL_ACCESS[a]} onClick={() => api.patchTool(t, { acceso: a })}>{TOOL_ACCESS[a]}</Chip>)}
                    <input value={c?.administra ?? ""} maxLength={200} aria-label={`Quién administra ${t}`} placeholder="¿Quién la administra?"
                      onChange={(e) => api.patchTool(t, { administra: e.target.value }, 800)} className={cn(inputCls, "ml-auto w-44")} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div><h3 className="text-sm font-medium">Ejemplos y volumen</h3>
          <p className="text-xs text-muted-foreground">Sin ejemplos reales no se puede probar ni medir una solución. Pide entre 5 y 10, sin datos personales.</p></div>
        <label className="flex flex-wrap items-center gap-2 text-sm">
          Casos por mes (aprox.)
          <input type="number" min={0} step="any" value={fields.casos_por_mes ?? ""} aria-label="Casos por mes"
            onChange={(e) => onFields({ casos_por_mes: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) }, 800)}
            className="h-8 w-28 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring" />
        </label>
        <ul className="space-y-2">
          {EJEMPLOS.map((e) => (
            <li key={e.key} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-60 flex-1">{e.label}</span>
              {STATES.map((st) => <Chip key={st} on={fields.ejemplos[e.key] === st} label={`${e.label}: ${EXAMPLE_STATE[st]}`} onClick={() => onFields({ ejemplos: { [e.key]: st } })}>{EXAMPLE_STATE[st]}</Chip>)}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Guarda los archivos en <Link className="text-primary hover:underline" href={`/clientes/${clientId}/documentos`}>Documentos</Link> (márcalos como confidenciales si corresponde).</p>
      </section>
    </div>
  );
}
