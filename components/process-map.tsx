"use client";

import { useId, useRef, useState } from "react";
import { STEP_TYPE } from "@/lib/labels";
import { summarize } from "@/lib/process-map";
import type { ProcessStep, StepPatch, StepType } from "@/lib/types";
import { ProcessDiagram } from "@/components/process-diagram";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TYPES: { v: StepType; icon: string }[] = [
  { v: "accion", icon: "▭" }, { v: "decision", icon: "◇" }, { v: "espera", icon: "⏳" }, { v: "sistema", icon: "⚙" },
];

export type StepsApi = {
  addMany: (pid: string, textos: string[], base?: Partial<Pick<ProcessStep, "tipo" | "actor" | "herramienta">>) => void;
  patch: (pid: string, stepId: string, p: StepPatch, delay?: number) => void;
  remove: (pid: string, stepId: string) => void;
  move: (pid: string, stepId: string, dir: -1 | 1) => void;
  duplicate: (pid: string, stepId: string) => void;
};

function Chip({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} title={label} onClick={onClick}
      className={cn("rounded-md border px-2 py-1 text-xs transition-colors",
        on ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
      {children}
    </button>
  );
}

const inputCls = "h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring";

/** Constructor de pasos con diagrama en vivo para un proceso. */
export function ProcessMap({ processId, steps, actors, tools, api }: {
  processId: string; steps: ProcessStep[]; actors: string[]; tools: string[]; api: StepsApi;
}) {
  const uid = useId().replace(/:/g, "");
  const [draft, setDraft] = useState("");
  const [tipo, setTipo] = useState<StepType>("accion");
  const [actor, setActor] = useState("");
  const [tool, setTool] = useState("");
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const sum = summarize(steps);

  function add(text: string) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    api.addMany(processId, lines, { tipo, actor, herramienta: tool });
    setDraft("");
    addRef.current?.focus();
  }
  function focusStep(id: string) {
    const el = document.getElementById(`step-${uid}-${id}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.querySelector<HTMLInputElement>("input[data-role=texto]")?.focus({ preventScroll: true });
  }
  function setTime(st: ProcessStep, which: "min" | "max", raw: string) {
    const v = raw === "" ? null : Math.max(0, Number(raw));
    if (v !== null && Number.isNaN(v)) return;
    let min = which === "min" ? v : st.minutos_min;
    let max = which === "max" ? v : st.minutos_max;
    if (min !== null && max !== null && min > max) { if (which === "min") max = min; else min = max; }
    api.patch(processId, st.id, { minutos_min: min, minutos_max: max }, 800);
  }

  return (
    <div className="grid gap-4 2xl:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <div className="space-y-2 rounded-xl border bg-card p-3">
          <div className="flex flex-wrap gap-2">
            <input ref={addRef} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Nuevo paso"
              placeholder="Escribe un paso y presiona Enter (o pega varios)"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }}
              onPaste={(e) => { const t = e.clipboardData.getData("text"); if (t.includes("\n")) { e.preventDefault(); add(t); } }}
              className="h-9 min-w-56 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
            <Button onClick={() => add(draft)} disabled={!draft.trim()}>Agregar paso</Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>Los nuevos son:</span>
            {TYPES.map((t) => <Chip key={t.v} on={tipo === t.v} label={`Tipo: ${STEP_TYPE[t.v]}`} onClick={() => setTipo(t.v)}>{t.icon} {STEP_TYPE[t.v]}</Chip>)}
            <input list={`${uid}-actors`} value={actor} onChange={(e) => setActor(e.target.value)} maxLength={100} aria-label="Quién los hace" placeholder="¿Quién?" className={cn(inputCls, "w-32")} />
            <input list={`${uid}-tools`} value={tool} onChange={(e) => setTool(e.target.value)} maxLength={100} aria-label="Herramienta" placeholder="Herramienta" className={cn(inputCls, "w-32")} />
          </div>
        </div>

        <datalist id={`${uid}-actors`}>{actors.map((a) => <option key={a} value={a} />)}</datalist>
        <datalist id={`${uid}-tools`}>{tools.map((t) => <option key={t} value={t} />)}</datalist>

        {steps.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Cuenta el último caso real, paso a paso. Cada paso que escribas aparece en el diagrama.
          </p>
        ) : (
          <ol className="space-y-2">
            {steps.map((st, i) => {
              const noteOpen = openNotes.has(st.id) || !!st.nota || st.problema;
              return (
                <li key={st.id} id={`step-${uid}-${st.id}`} className={cn("space-y-2 rounded-xl border bg-card p-3", st.problema && "border-destructive/60")}>
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border font-mono text-xs">{i + 1}</span>
                    <input data-role="texto" key={st.id} defaultValue={st.texto} maxLength={300} aria-label={`Paso ${i + 1}`}
                      onChange={(e) => { if (e.target.value.trim()) api.patch(processId, st.id, { texto: e.target.value }, 800); }}
                      onBlur={(e) => { if (!e.target.value.trim()) e.target.value = st.texto; }}
                      className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm font-medium outline-none hover:border-input focus-visible:border-ring" />
                    <span className="flex shrink-0 items-center gap-0.5 text-xs">
                      <button type="button" aria-label="Subir paso" title="Subir" disabled={i === 0} onClick={() => api.move(processId, st.id, -1)} className="px-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30">↑</button>
                      <button type="button" aria-label="Bajar paso" title="Bajar" disabled={i === steps.length - 1} onClick={() => api.move(processId, st.id, 1)} className="px-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30">↓</button>
                      <button type="button" aria-label="Duplicar paso" title="Duplicar" onClick={() => api.duplicate(processId, st.id)} className="px-1.5 text-muted-foreground hover:text-foreground">⧉</button>
                      {confirmId === st.id ? (
                        <span className="flex items-center gap-1">
                          <Button size="xs" variant="destructive" onClick={() => { api.remove(processId, st.id); setConfirmId(null); }}>Quitar</Button>
                          <Button size="xs" variant="outline" onClick={() => setConfirmId(null)}>No</Button>
                        </span>
                      ) : (
                        <button type="button" aria-label="Quitar paso" title="Quitar" onClick={() => setConfirmId(st.id)} className="px-1.5 text-muted-foreground hover:text-destructive">✕</button>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {TYPES.map((t) => <Chip key={t.v} on={st.tipo === t.v} label={`Tipo: ${STEP_TYPE[t.v]}`} onClick={() => api.patch(processId, st.id, { tipo: t.v })}>{t.icon}</Chip>)}
                    <input list={`${uid}-actors`} value={st.actor ?? ""} maxLength={100} aria-label="Quién" placeholder="¿Quién?" onChange={(e) => api.patch(processId, st.id, { actor: e.target.value }, 800)} className={cn(inputCls, "w-28")} />
                    <input list={`${uid}-tools`} value={st.herramienta ?? ""} maxLength={100} aria-label="Herramienta" placeholder="Herramienta" onChange={(e) => api.patch(processId, st.id, { herramienta: e.target.value }, 800)} className={cn(inputCls, "w-28")} />
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      ⏱
                      <input type="number" min={0} step="any" value={st.minutos_min ?? ""} aria-label="Minutos mínimo" placeholder="mín" onChange={(e) => setTime(st, "min", e.target.value)} className={cn(inputCls, "w-14")} />
                      –
                      <input type="number" min={0} step="any" value={st.minutos_max ?? ""} aria-label="Minutos máximo" placeholder="máx" onChange={(e) => setTime(st, "max", e.target.value)} className={cn(inputCls, "w-14")} />
                      min
                    </span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <Chip on={st.problema} label="Hay un problema en este paso" onClick={() => api.patch(processId, st.id, { problema: !st.problema })}>⚠ Problema</Chip>
                      <Chip on={noteOpen} label="Nota" onClick={() => setOpenNotes((p) => { const n = new Set(p); if (n.has(st.id)) n.delete(st.id); else n.add(st.id); return n; })}>📝</Chip>
                    </span>
                  </div>
                  {noteOpen && (
                    <Textarea rows={2} maxLength={1000} value={st.nota ?? ""} aria-label="Nota del paso"
                      placeholder={st.problema ? "¿Qué falla aquí? (error, retrabajo, espera…)" : "Detalle, excepción, ejemplo…"}
                      onChange={(e) => api.patch(processId, st.id, { nota: e.target.value }, 800)} />
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {steps.length > 0 && (
          <p className="font-mono text-xs text-muted-foreground">
            {steps.length} pasos · {sum.actores.length} personas/roles · {sum.herramientas.length} herramientas · {sum.problemas.length} con problema
            {sum.minutosMin !== null && ` · ${sum.minutosMin}–${sum.minutosMax} min en total`}
            {sum.sinTiempo > 0 && sum.minutosMin !== null && ` (${sum.sinTiempo} sin tiempo)`}
          </p>
        )}
      </div>

      <div className="min-w-0 2xl:sticky 2xl:top-28 2xl:self-start">
        <div className="rounded-xl border bg-card p-3">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Diagrama (se dibuja solo)</h3>
          <ProcessDiagram steps={steps} onSelect={focusStep} />
          <p className="mt-2 text-[11px] text-muted-foreground">▭ acción · ◇ decisión · ⏳ espera (línea punteada) · ⚙ en sistema (barra azul) · rojo = problema</p>
        </div>
      </div>
    </div>
  );
}
