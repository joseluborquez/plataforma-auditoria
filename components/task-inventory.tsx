"use client";

import { useRef, useState } from "react";
import { FREQ } from "@/lib/labels";
import type { Freq, InterviewTask, Opt, TaskPatch } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const FREQS = Object.keys(FREQ) as Freq[];
type Filter = "todas" | "tiempo" | "errores" | "elegidas";

type Props = {
  tasks: InterviewTask[];
  areas: Opt[];
  defaultAreaId: string | null;
  peopleNames: string[];
  available: Opt[];
  onAdd: (names: string[], areaId: string, frecuencia: Freq | null) => Promise<void>;
  onPatch: (processId: string, patch: TaskPatch, delay?: number) => void;
  onRemove: (processId: string) => Promise<void>;
  onLink: (processId: string) => Promise<void>;
};

function Toggle({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} title={label} aria-label={label} onClick={onClick}
      className={cn("rounded-md border px-2 py-1 text-xs transition-colors",
        on ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
      {children}
    </button>
  );
}

export function TaskInventory({ tasks, areas, defaultAreaId, peopleNames, available, onAdd, onPatch, onRemove, onLink }: Props) {
  const [draft, setDraft] = useState("");
  const [freq, setFreq] = useState<Freq | null>(null);
  const [areaId, setAreaId] = useState(defaultAreaId ?? areas[0]?.id ?? "");
  const [filter, setFilter] = useState<Filter>("todas");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [linkId, setLinkId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const count = {
    tiempo: tasks.filter((t) => t.pesa_tiempo).length,
    errores: tasks.filter((t) => t.molesta_errores).length,
    elegidas: tasks.filter((t) => t.para_detalle).length,
  };
  const visible = tasks.filter((t) =>
    filter === "tiempo" ? t.pesa_tiempo : filter === "errores" ? t.molesta_errores : filter === "elegidas" ? t.para_detalle : true);
  const areaName = Object.fromEntries(areas.map((a) => [a.id, a.nombre]));

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }
  async function add(text: string) {
    const names = text.split("\n").map((s) => s.trim()).filter(Boolean);
    if (names.length === 0 || !areaId) return;
    await run(async () => { await onAdd(names, areaId, freq); setDraft(""); });
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-3">
      {areas.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Crea las áreas en la pestaña Resumen para poder registrar tareas.</p>
      ) : (
        <div className="space-y-2 rounded-xl border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy}
              aria-label="Nueva tarea" placeholder="Escribe una tarea y presiona Enter (o pega una lista)"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(draft); } }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text.includes("\n")) { e.preventDefault(); void add(text); }
              }}
              className="h-9 min-w-56 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
            {areas.length > 1 && (
              <select aria-label="Área de la tarea" value={areaId} onChange={(e) => setAreaId(e.target.value)}
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm">
                {areas.map((a) => <option key={a.id} value={a.id} className="bg-card">{a.nombre}</option>)}
              </select>
            )}
            <Button onClick={() => void add(draft)} disabled={busy || !draft.trim()}>{busy ? "Agregando…" : "Agregar"}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>Las nuevas tareas son:</span>
            {FREQS.map((f) => (
              <Toggle key={f} on={freq === f} label={`Nuevas tareas: ${FREQ[f]}`} onClick={() => setFreq(freq === f ? null : f)}>{FREQ[f]}</Toggle>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-muted-foreground">
          {tasks.length} tareas · {count.tiempo} pesan · {count.errores} con errores ·{" "}
          <span className={cn(count.elegidas > 3 && "text-destructive")}>{count.elegidas} elegidas</span>
        </span>
        <span className="ml-auto flex gap-1">
          {([["todas", "Todas"], ["tiempo", "⏱ Pesan"], ["errores", "⚠ Molestan"], ["elegidas", "⭐ Elegidas"]] as const).map(([k, l]) => (
            <Toggle key={k} on={filter === k} label={`Filtrar: ${l}`} onClick={() => setFilter(k)}>{l}</Toggle>
          ))}
        </span>
      </div>
      {count.elegidas > 3 && <p className="text-xs text-destructive">Se sugiere detallar solo 2 o 3 tareas por entrevista.</p>}

      <datalist id="task-people">{peopleNames.map((n) => <option key={n} value={n} />)}</datalist>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {tasks.length === 0 ? "Aún no hay tareas. Escribe la primera arriba o pega una lista." : "Ninguna tarea cumple este filtro."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((t) => (
            <li key={t.process_id} className={cn("space-y-2 rounded-xl border bg-card p-3", t.para_detalle && "border-primary/60")}>
              <div className="flex items-center gap-2">
                <input key={t.nombre} defaultValue={t.nombre} aria-label="Nombre de la tarea" maxLength={200}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.nombre) onPatch(t.process_id, { nombre: v }); else e.target.value = t.nombre; }}
                  className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm font-medium outline-none hover:border-input focus-visible:border-ring" />
                {areas.length > 1 && t.area_id && <Badge variant="outline">{areaName[t.area_id] ?? ""}</Badge>}
                {confirmId === t.process_id ? (
                  <span className="flex items-center gap-1 text-xs">
                    ¿Quitar?
                    <Button size="xs" variant="destructive" disabled={busy}
                      onClick={() => void run(async () => { await onRemove(t.process_id); setConfirmId(null); })}>Sí</Button>
                    <Button size="xs" variant="outline" onClick={() => setConfirmId(null)}>No</Button>
                  </span>
                ) : (
                  <button type="button" title="Quitar de esta entrevista" aria-label="Quitar tarea"
                    className="px-1 text-xs text-muted-foreground hover:text-destructive" onClick={() => setConfirmId(t.process_id)}>✕</button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {FREQS.map((f) => (
                  <Toggle key={f} on={t.frecuencia === f} label={`Frecuencia: ${FREQ[f]}`}
                    onClick={() => onPatch(t.process_id, { frecuencia: t.frecuencia === f ? null : f })}>{FREQ[f]}</Toggle>
                ))}
                <input list="task-people" value={t.quien_hace ?? ""} aria-label="Quién la hace" maxLength={200} placeholder="¿Quién la hace?"
                  onChange={(e) => onPatch(t.process_id, { quien_hace: e.target.value }, 800)}
                  className="h-7 w-44 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring" />
                <span className="ml-auto flex items-center gap-1.5">
                  <Toggle on={t.pesa_tiempo} label="Le quita mucho tiempo" onClick={() => onPatch(t.process_id, { pesa_tiempo: !t.pesa_tiempo })}>⏱ Pesa</Toggle>
                  <Toggle on={t.molesta_errores} label="Molesta o tiene errores" onClick={() => onPatch(t.process_id, { molesta_errores: !t.molesta_errores })}>⚠ Molesta</Toggle>
                  <Toggle on={t.para_detalle} label="Elegida para detallar" onClick={() => onPatch(t.process_id, { para_detalle: !t.para_detalle })}>⭐ Detallar</Toggle>
                  <Toggle on={openNotes.has(t.process_id) || !!t.nota} label="Nota"
                    onClick={() => setOpenNotes((prev) => { const n = new Set(prev); if (n.has(t.process_id)) n.delete(t.process_id); else n.add(t.process_id); return n; })}>📝</Toggle>
                </span>
              </div>
              {(openNotes.has(t.process_id) || !!t.nota) && (
                <Textarea value={t.nota ?? ""} rows={2} maxLength={2000} aria-label="Nota de la tarea" placeholder="Por qué pesa o molesta, ejemplos, dudas…"
                  onChange={(e) => onPatch(t.process_id, { nota: e.target.value }, 800)} />
              )}
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <select aria-label="Agregar un proceso que ya existe" value={linkId} onChange={(e) => setLinkId(e.target.value)}
            className="h-8 max-w-64 rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="" className="bg-card">Agregar un proceso que ya existe…</option>
            {available.map((p) => <option key={p.id} value={p.id} className="bg-card">{p.nombre}</option>)}
          </select>
          <Button size="sm" variant="secondary" disabled={busy || !linkId}
            onClick={() => void run(async () => { await onLink(linkId); setLinkId(""); })}>Agregar</Button>
        </div>
      )}
    </div>
  );
}
