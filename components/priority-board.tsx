"use client";

import type { AreaConditions, InterviewTask, TaskPatch } from "@/lib/types";
import { ChipList } from "@/components/chip-list";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const RESTRICCIONES = ["Conectividad", "Equipos", "Sistemas actuales", "Permisos", "Presupuesto", "Capacitación del equipo"];

function Rank({ value, onChange, label }: { value: 1 | 2 | 3 | null; onChange: (v: 1 | 2 | 3 | null) => void; label: string }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <span className="mr-1 text-xs text-muted-foreground">{label}</span>
      {([1, 2, 3] as const).map((n) => (
        <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(value === n ? null : n)}
          className={cn("size-7 rounded-md border text-sm transition-colors", value === n ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{n}</button>
      ))}
    </div>
  );
}

/** Prioridad, idea de cambio, restricciones y quién aprueba, tarea por tarea (y para toda el área). */
export function PriorityBoard({ tipo, tasks, onPatch, area, onArea, approvers, goInventory }: {
  tipo: "encargado" | "trabajador"; tasks: InterviewTask[]; onPatch: (processId: string, patch: TaskPatch, delay?: number) => void;
  area: AreaConditions; onArea: (p: Partial<AreaConditions>, delay?: number) => void; approvers: string[]; goInventory: () => void;
}) {
  const enc = tipo === "encargado";
  const ranked = [...tasks].filter((t) => t.prioridad).sort((a, b) => a.prioridad! - b.prioridad!);
  const rankLabel = enc ? "Eliminaría primero:" : "Cambiaría primero:";

  function setRank(t: InterviewTask, v: 1 | 2 | 3 | null) {
    if (v !== null) for (const o of tasks) if (o.process_id !== t.process_id && o.prioridad === v) onPatch(o.process_id, { prioridad: null });
    onPatch(t.process_id, { prioridad: v });
  }

  return (
    <div className="space-y-3">
      <datalist id="approvers">{approvers.map((a) => <option key={a} value={a} />)}</datalist>
      {tasks.length === 0 ? (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Aún no hay tareas en esta entrevista. Agrégalas en el{" "}
          <button type="button" className="text-primary hover:underline" onClick={goInventory}>inventario</button> y vuelve aquí.
        </p>
      ) : (
        <>
          {ranked.length > 0 && (
            <p className="rounded-xl border bg-card p-3 text-sm">
              <span className="text-muted-foreground">Orden de prioridad: </span>
              {ranked.map((t) => <span key={t.process_id} className="mr-3"><b className="font-mono">{t.prioridad}.</b> {t.nombre}</span>)}
            </p>
          )}
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.process_id} className={cn("space-y-2 rounded-xl border bg-card p-3", t.prioridad && "border-primary/50")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t.nombre}</p>
                  <Rank value={t.prioridad} onChange={(v) => setRank(t, v)} label={rankLabel} />
                </div>
                {!enc && (
                  <Textarea rows={2} maxLength={1000} value={t.idea ?? ""} aria-label={`Qué cambiaría de ${t.nombre}`}
                    placeholder="¿Qué cambiaría de esta tarea? (con sus palabras)" onChange={(e) => onPatch(t.process_id, { idea: e.target.value }, 800)} />
                )}
                {enc && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <ChipList label="Restricciones" hint="¿Qué dificulta cambiarla?" values={t.restricciones} suggestions={RESTRICCIONES}
                      onChange={(v) => onPatch(t.process_id, { restricciones: v }, 300)} placeholder="Ej.: sin internet en el centro" />
                    <label className="space-y-1.5 text-sm font-medium">
                      ¿Quién aprueba un cambio?
                      <input list="approvers" value={t.aprueba ?? ""} maxLength={200} onChange={(e) => onPatch(t.process_id, { aprueba: e.target.value }, 800)}
                        placeholder="Persona o cargo" className="mt-1.5 block h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm font-normal outline-none focus-visible:border-ring" />
                    </label>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {enc && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div><h3 className="text-sm font-medium">Para toda el área</h3><p className="text-xs text-muted-foreground">Lo que vale en general y no es de una tarea en particular.</p></div>
          <div className="grid gap-3 md:grid-cols-2">
            <ChipList label="Restricciones generales" values={area.restricciones} suggestions={RESTRICCIONES}
              onChange={(v) => onArea({ restricciones: v }, 300)} placeholder="Ej.: presupuesto congelado este año" />
            <label className="space-y-1.5 text-sm font-medium">
              ¿Quién aprueba los cambios del área?
              <input list="approvers" value={area.aprueba ?? ""} maxLength={200} onChange={(e) => onArea({ aprueba: e.target.value }, 800)}
                placeholder="Persona o cargo" className="mt-1.5 block h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm font-normal outline-none focus-visible:border-ring" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
