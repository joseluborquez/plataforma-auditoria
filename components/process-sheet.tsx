"use client";

import Link from "next/link";
import { useState } from "react";
import { saveStepsMeasurementAction } from "@/app/(panel)/clientes/[id]/procesos/fields-actions";
import { DATA_STATE, MEAS_METHOD } from "@/lib/labels";
import { formatRange, summarize, timePatch } from "@/lib/process-map";
import { DISPARADORES, SIPOC_LISTS, sheetChecks } from "@/lib/process-sheet";
import { readiness } from "@/lib/readiness";
import type { ClientTool, DataState, FieldsPatch, ProcessFields, ProcessSource, ProcessStep, SipocLists } from "@/lib/types";
import { ChipList } from "@/components/chip-list";
import { ProcessMap, type StepsApi } from "@/components/process-map";
import { ReadinessBlock } from "@/components/readiness-block";
import type { ReadinessApi } from "@/components/use-readiness";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type SipocSuggestions = Record<keyof SipocLists, string[]>;

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div><h3 className="text-sm font-medium">{title}</h3>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      {children}
    </section>
  );
}

function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("rounded-md border px-2.5 py-1 text-sm transition-colors", on ? "border-primary bg-primary/15" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
      {children}
    </button>
  );
}

/** Ficha rápida de un proceso: todo con chips y un mapa; lo demás se calcula desde los pasos. */
export function ProcessSheet({ clientId, processId, name, steps, fields, stepsApi, onFields, actors, tools, sipocSuggestions, defaultVeces, defaultMetodo, measured, onMeasured, sources, clientTools, readinessApi }: {
  clientId: string; processId: string; name?: string; steps: ProcessStep[]; fields: ProcessFields; stepsApi: StepsApi;
  onFields: (p: FieldsPatch, delay?: number) => void; actors: string[]; tools: string[]; sipocSuggestions: SipocSuggestions;
  defaultVeces: number | null; defaultMetodo: "declarado" | "cronometrado"; measured: boolean; onMeasured: () => void;
  sources: ProcessSource[]; clientTools: ClientTool[]; readinessApi: ReadinessApi;
}) {
  const sum = summarize(steps);
  const checks = sheetChecks(steps, fields, measured);
  const ready = readiness({ sources, toolsUsed: sum.herramientas, clientTools, ejemplos: fields.ejemplos, casosPorMes: fields.casos_por_mes });
  const [veces, setVeces] = useState(defaultVeces !== null ? String(defaultVeces) : "");
  const [personas, setPersonas] = useState(String(Math.max(1, sum.actores.length)));
  const [metodo, setMetodo] = useState<"declarado" | "cronometrado" | "registro_sistema">(defaultMetodo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [totalMin, setTotalMin] = useState("");
  const [totalMax, setTotalMax] = useState("");
  const manual = sum.minutosMin === null;
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  const tMin = num(totalMin), tMax = num(totalMax);
  const manualOk = (tMin !== null || tMax !== null) && [tMin, tMax].every((x) => x === null || (!Number.isNaN(x) && x >= 0)) && (tMin === null || tMax === null || tMin <= tMax);
  const effMin = manual ? (tMin ?? tMax) : sum.minutosMin;
  const effMax = manual ? (tMax ?? tMin) : sum.minutosMax;
  const sig = `${effMin}-${effMax}-${veces}-${personas}-${metodo}`;
  const vecesNum = Number(veces);
  const canSave = (manual ? manualOk : true) && effMin !== null && veces.trim() !== "" && !Number.isNaN(vecesNum) && vecesNum >= 0 && saved !== sig;

  async function saveMeasurement() {
    setSaving(true); setError(null);
    try {
      await saveStepsMeasurementAction(clientId, processId, {
        veces_por_semana: vecesNum, personas: Math.max(1, Math.round(Number(personas) || 1)), metodo,
        total_min: manual ? tMin : null, total_max: manual ? tMax : null,
      });
      setSaved(sig);
      onMeasured();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar"); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {checks.map((c) => <Badge key={c.key} variant={c.done ? "default" : "outline"}>{c.done ? "✓" : "○"} {c.label}</Badge>)}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Para implementar:</span>
        {ready.map((r) => <Badge key={r.key} variant={r.done ? "default" : "outline"} title={r.detail}>{r.done ? "✓" : "○"} {r.label}</Badge>)}
      </div>

      <Block title="¿Qué hace que el proceso parta?" hint="Disparador">
        <div className="flex flex-wrap gap-1.5">
          {DISPARADORES.map((d) => <Pick key={d} on={fields.disparador === d} onClick={() => onFields({ disparador: fields.disparador === d ? null : d })}>{d}</Pick>)}
        </div>
        <input value={fields.disparador ?? ""} maxLength={200} aria-label="Disparador" placeholder="O escríbelo con tus palabras"
          onChange={(e) => onFields({ disparador: e.target.value }, 800)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring" />
      </Block>

      <ProcessMap processId={processId} name={name} steps={steps} actors={actors} tools={tools} api={stepsApi} />

      <Block title="¿Qué entra y qué sale?" hint="Lo que recibe el proceso y lo que entrega. Lo que pasa en el medio son los pasos de arriba.">
        <details className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer">Ver un ejemplo</summary>
          <p className="mt-2">
            <b>Liquidación de sueldos.</b> Lo recibe de: jefaturas y control de asistencia. Necesita: planilla de horas y licencias médicas.
            Entrega: liquidaciones y archivo para el banco. Se lo entrega a: el trabajador y Contabilidad.
          </p>
        </details>
        <div className="grid gap-4 md:grid-cols-2">
          {SIPOC_LISTS.map(([k, label, hint, example]) => (
            <ChipList key={k} label={label} hint={hint} placeholder={example} values={fields.sipoc[k]} suggestions={sipocSuggestions[k]}
              onChange={(v) => onFields({ sipoc: { [k]: v } }, 300)} />
          ))}
        </div>
      </Block>

      <div className="grid gap-4 md:grid-cols-2">
        <Block title="Herramientas" hint="Se toman de los pasos">
          {sum.herramientas.length === 0 ? <p className="text-sm text-muted-foreground">Aparecerán al indicar la herramienta en cada paso.</p> : (
            <div className="flex flex-wrap gap-1.5">{sum.herramientas.map((h) => <Badge key={h} variant="secondary">{h}</Badge>)}</div>
          )}
        </Block>
        <Block title="¿Dónde viven los datos?" hint="Estado de los datos">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(DATA_STATE) as DataState[]).map((d) => <Pick key={d} on={fields.estado_datos === d} onClick={() => onFields({ estado_datos: fields.estado_datos === d ? null : d })}>{DATA_STATE[d]}</Pick>)}
          </div>
        </Block>
      </div>

      <Block title="Tiempo" hint="¿Cuánto demora cada vez que se hace?">
        <div className="space-y-3">
          {steps.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Anota cuánto demora cada paso (mínimo y máximo, en minutos). El total se calcula solo.</p>
              <ul className="space-y-1">
                {steps.map((st, i) => (
                  <li key={st.id} className="flex items-center gap-2 text-sm">
                    <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">{i + 1}.</span>
                    <span className="min-w-0 flex-1 truncate" title={st.texto}>{st.texto}</span>
                    <input type="number" min={0} step="any" value={st.minutos_min ?? ""} aria-label={`Minutos mínimo del paso ${i + 1}`} placeholder="mín"
                      onChange={(e) => { const p = timePatch(st, "min", e.target.value); if (p) stepsApi.patch(processId, st.id, p, 800); }}
                      className="h-7 w-16 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring" />
                    <span className="text-muted-foreground">–</span>
                    <input type="number" min={0} step="any" value={st.minutos_max ?? ""} aria-label={`Minutos máximo del paso ${i + 1}`} placeholder="máx"
                      onChange={(e) => { const p = timePatch(st, "max", e.target.value); if (p) stepsApi.patch(processId, st.id, p, 800); }}
                      className="h-7 w-16 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring" />
                    <span className="w-8 text-xs text-muted-foreground">min</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Agrega los pasos en el mapa de arriba para anotar el tiempo de cada uno, o escribe el total directamente aquí abajo.</p>
          )}

          {manual ? (
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <p className="text-xs text-muted-foreground">
                {steps.length > 0 ? "¿No sabes el tiempo por paso? " : ""}Escribe el <b>tiempo total</b> que dice la persona (por ejemplo, «entre 30 y 45 minutos»).
              </p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input type="number" min={0} step="any" value={totalMin} onChange={(e) => setTotalMin(e.target.value)} aria-label="Total mínimo en minutos" placeholder="mín"
                  className="h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring" />
                <span className="text-muted-foreground">–</span>
                <input type="number" min={0} step="any" value={totalMax} onChange={(e) => setTotalMax(e.target.value)} aria-label="Total máximo en minutos" placeholder="máx"
                  className="h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring" />
                <span className="text-xs text-muted-foreground">minutos en total</span>
                {(tMin !== null || tMax !== null) && !manualOk && <span className="text-xs text-destructive">Revisa los valores (el mínimo no puede superar al máximo).</span>}
              </div>
            </div>
          ) : (
            <p className="text-sm">
              Cada vez demora <span className="font-mono font-medium">{formatRange(sum.minutosMin, sum.minutosMax)}</span>
              {sum.sinTiempo > 0 && <span className="text-muted-foreground"> ({sum.sinTiempo} paso(s) sin tiempo)</span>}.
            </p>
          )}

          {effMin !== null && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs text-muted-foreground">Para guardarlo como medición indica cada cuánto se hace y quiénes lo hacen.</p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="space-y-1 text-xs text-muted-foreground">Veces por semana
                  <input type="number" min={0} step="any" value={veces} onChange={(e) => setVeces(e.target.value)}
                    className="mt-1 block h-8 w-28 rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring" />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">Personas que lo hacen
                  <input type="number" min={1} step={1} value={personas} onChange={(e) => setPersonas(e.target.value)}
                    className="mt-1 block h-8 w-28 rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring" />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">Método
                  <select value={metodo} onChange={(e) => setMetodo(e.target.value as typeof metodo)}
                    className="mt-1 block h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground">
                    {(Object.keys(MEAS_METHOD) as (keyof typeof MEAS_METHOD)[]).map((m) => <option key={m} value={m} className="bg-card">{MEAS_METHOD[m]}</option>)}
                  </select>
                </label>
                <Button onClick={() => void saveMeasurement()} disabled={!canSave || saving}>{saving ? "Guardando…" : saved === sig ? "Medición guardada ✓" : "Guardar como medición"}</Button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {saved === sig && <p className="text-xs text-muted-foreground">Quedó en <Link className="text-primary hover:underline" href={`/clientes/${clientId}/mediciones`}>Mediciones</Link> como línea base.</p>}
            </div>
          )}
        </div>
      </Block>

      <Block title="Excepciones y problemas">
        <ChipList label="Excepciones" hint="¿Cuándo se hace distinto?" values={fields.excepciones} onChange={(v) => onFields({ excepciones: v }, 300)}
          placeholder="Ej.: cliente sin RUT, pedido urgente…" />
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Problemas<span className="ml-2 text-xs font-normal text-muted-foreground">Los pasos con ⚠ se listan solos</span></p>
          {sum.problemas.length > 0 && (
            <ul className="space-y-1 text-sm">
              {sum.problemas.map((p) => <li key={p.id} className="flex gap-2"><span className="text-destructive">⚠</span><span><b>{p.texto}</b>{p.nota ? ` — ${p.nota}` : ""}</span></li>)}
            </ul>
          )}
          <Textarea rows={2} maxLength={2000} value={fields.problemas ?? ""} aria-label="Otros problemas" placeholder="Otros problemas que no son de un paso en particular (dependencia de una persona, riesgos…)"
            onChange={(e) => onFields({ problemas: e.target.value }, 800)} />
        </div>
      </Block>

      <div className="space-y-3">
        <div><h3 className="text-sm font-medium">Para implementar la solución</h3>
          <p className="text-xs text-muted-foreground">Lo que hace falta saber si después se construirá una automatización, un RAG o un copiloto con IA.</p></div>
        <ReadinessBlock clientId={clientId} processId={processId} sources={sources} toolsUsed={sum.herramientas} clientTools={clientTools}
          fields={{ casos_por_mes: fields.casos_por_mes, ejemplos: fields.ejemplos }} api={readinessApi} onFields={onFields} />
      </div>
    </div>
  );
}
