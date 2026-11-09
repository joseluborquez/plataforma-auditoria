"use client";

import { useRef, useState } from "react";
import { PROBLEM_TYPE } from "@/lib/labels";
import { countByType, PROBLEM_TYPES } from "@/lib/problems";
import type { InterviewProblem, Opt, ProblemPatch, ProblemType, ProcessStep } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ProblemsApi = {
  add: (texto: string, base: { process_id: string | null; step_id?: string | null; tipo: ProblemType }) => void;
  patch: (id: string, p: ProblemPatch, delay?: number) => void;
  remove: (id: string) => void;
};

const ICON: Record<ProblemType, string> = { error: "⚠", dependencia: "👤", riesgo_legal: "⚖", espera: "⏳", otro: "•" };
type Filter = "todos" | "procesos" | "generales";

function Chip({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} title={label} onClick={onClick}
      className={cn("rounded-md border px-2 py-1 text-xs transition-colors", on ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
      {children}
    </button>
  );
}

/** Lista rápida de problemas y riesgos; cada uno se liga a un proceso (y a un paso del mapa) o queda como hallazgo del área. */
export function ProblemBoard({ problems, api, processes, stepsOf, onMarkStep }: {
  problems: InterviewProblem[]; api: ProblemsApi; processes: Opt[]; stepsOf: (processId: string) => ProcessStep[];
  onMarkStep: (processId: string, stepId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [tipo, setTipo] = useState<ProblemType>("error");
  const [processId, setProcessId] = useState<string>("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const procName = Object.fromEntries(processes.map((p) => [p.id, p.nombre]));
  const count = countByType(problems);
  const visible = problems.filter((p) => filter === "procesos" ? !!p.process_id : filter === "generales" ? !p.process_id : true);

  function add(text: string) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const l of lines) api.add(l, { process_id: processId || null, tipo });
    if (lines.length) setDraft("");
    inputRef.current?.focus();
  }
  const select = "h-8 max-w-60 rounded-lg border border-input bg-transparent px-2 text-sm";

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl border bg-card p-3">
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Nuevo problema" maxLength={500}
            placeholder="Escribe un problema o riesgo y presiona Enter"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }}
            onPaste={(e) => { const t = e.clipboardData.getData("text"); if (t.includes("\n")) { e.preventDefault(); add(t); } }}
            className="h-9 min-w-56 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
          <Button onClick={() => add(draft)} disabled={!draft.trim()}>Agregar</Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>Afecta a:</span>
          <select aria-label="Proceso afectado" value={processId} onChange={(e) => setProcessId(e.target.value)} className={select}>
            <option value="" className="bg-card">Toda el área (general)</option>
            {processes.map((p) => <option key={p.id} value={p.id} className="bg-card">{p.nombre}</option>)}
          </select>
          <span className="ml-2">Tipo:</span>
          {PROBLEM_TYPES.map((t) => <Chip key={t} on={tipo === t} label={`Tipo: ${PROBLEM_TYPE[t]}`} onClick={() => setTipo(t)}>{ICON[t]} {PROBLEM_TYPE[t]}</Chip>)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-muted-foreground">
          {problems.length} problemas · {count.error} errores · {count.riesgo_legal} legales · {count.dependencia} de dependencia · {problems.filter((p) => !p.process_id).length} generales
        </span>
        <span className="ml-auto flex gap-1">
          {([["todos", "Todos"], ["procesos", "De un proceso"], ["generales", "Generales"]] as const).map(([k, l]) => (
            <Chip key={k} on={filter === k} label={`Filtrar: ${l}`} onClick={() => setFilter(k)}>{l}</Chip>
          ))}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {problems.length === 0 ? "Aún no hay problemas. Escribe el primero arriba." : "Ninguno cumple este filtro."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((p) => {
            const steps = p.process_id ? stepsOf(p.process_id) : [];
            const step = steps.find((s) => s.id === p.step_id);
            const noteOpen = openNotes.has(p.id) || !!p.nota;
            return (
              <li key={p.id} className={cn("space-y-2 rounded-xl border bg-card p-3", p.tipo === "riesgo_legal" && "border-destructive/50")}>
                <div className="flex items-center gap-2">
                  <span aria-hidden>{ICON[p.tipo]}</span>
                  <input key={p.id} defaultValue={p.texto} maxLength={500} aria-label="Problema"
                    onChange={(e) => { if (e.target.value.trim()) api.patch(p.id, { texto: e.target.value }, 800); }}
                    onBlur={(e) => { if (!e.target.value.trim()) e.target.value = p.texto; }}
                    className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm font-medium outline-none hover:border-input focus-visible:border-ring" />
                  {confirmId === p.id ? (
                    <span className="flex items-center gap-1 text-xs">
                      ¿Quitar?
                      <Button size="xs" variant="destructive" onClick={() => { api.remove(p.id); setConfirmId(null); }}>Sí</Button>
                      <Button size="xs" variant="outline" onClick={() => setConfirmId(null)}>No</Button>
                    </span>
                  ) : (
                    <button type="button" aria-label="Quitar problema" title="Quitar" className="px-1 text-xs text-muted-foreground hover:text-destructive" onClick={() => setConfirmId(p.id)}>✕</button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {PROBLEM_TYPES.map((t) => <Chip key={t} on={p.tipo === t} label={`Tipo: ${PROBLEM_TYPE[t]}`} onClick={() => api.patch(p.id, { tipo: t })}>{ICON[t]}</Chip>)}
                  <Badge variant="outline">{PROBLEM_TYPE[p.tipo]}</Badge>
                  <select aria-label="Proceso afectado" value={p.process_id ?? ""} className={select}
                    onChange={(e) => api.patch(p.id, { process_id: e.target.value || null, step_id: null })}>
                    <option value="" className="bg-card">Toda el área (general)</option>
                    {processes.map((x) => <option key={x.id} value={x.id} className="bg-card">{x.nombre}</option>)}
                  </select>
                  {p.process_id && steps.length > 0 && (
                    <select aria-label="Paso afectado" value={p.step_id ?? ""} className={select}
                      onChange={(e) => api.patch(p.id, { step_id: e.target.value || null })}>
                      <option value="" className="bg-card">Sin paso en particular</option>
                      {steps.map((s, i) => <option key={s.id} value={s.id} className="bg-card">{i + 1}. {s.texto.slice(0, 40)}</option>)}
                    </select>
                  )}
                  {p.process_id && step && (step.problema
                    ? <span className="text-xs text-muted-foreground">✓ El paso ya está marcado con ⚠ en el mapa</span>
                    : <Button size="xs" variant="outline" onClick={() => onMarkStep(p.process_id!, step.id)}>Marcar ⚠ en el mapa</Button>)}
                  <span className="ml-auto"><Chip on={noteOpen} label="Nota" onClick={() => setOpenNotes((prev) => { const n = new Set(prev); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })}>📝</Chip></span>
                </div>
                {p.process_id && !processes.some((x) => x.id === p.process_id) && (
                  <p className="text-xs text-muted-foreground">Proceso: {procName[p.process_id] ?? "(ya no está en esta entrevista)"}</p>
                )}
                {noteOpen && (
                  <Textarea rows={2} maxLength={1000} value={p.nota ?? ""} aria-label="Nota del problema" placeholder="Ejemplo, cuánto cuesta, con qué frecuencia ocurre…"
                    onChange={(e) => api.patch(p.id, { nota: e.target.value }, 800)} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
