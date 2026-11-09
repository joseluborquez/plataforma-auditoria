"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Guide } from "@/lib/guide";
import {
  createProcessesFromInterviewAction, finishInterviewAction, linkExistingProcessAction,
  saveAnswerAction, saveTimingAction, toggleCheckAction, unlinkProcessFromInterviewAction,
} from "@/app/(panel)/clientes/[id]/guion/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type LiveAnswer = { respuesta: string; no_aplica: boolean };
type Opt = { id: string; nombre: string };
type Step = { kind: "pre" } | { kind: "section"; index: number } | { kind: "post" } | { kind: "rubrica" };

export type InterviewLiveProps = {
  clientId: string;
  tipo: "encargado" | "trabajador";
  guide: Guide;
  pre: string[]; post: string[]; tips: string[];
  interviews: { id: string; label: string }[];
  /** null = solo lectura (no hay entrevista elegida) */
  interview: { id: string; estado: "pendiente" | "agendada" | "realizada"; area_id: string | null } | null;
  initialAnswers: Record<string, LiveAnswer>;
  initialChecks: string[];
  initialTiming: Record<number, number>;
  linked: Opt[]; available: Opt[]; areas: Opt[];
  children: React.ReactNode;
};

const EMPTY: LiveAnswer = { respuesta: "", no_aplica: false };
const keyOf = (s: number, q: number) => `s${s}q${q}`;
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;

export function InterviewLive(props: InterviewLiveProps) {
  const { clientId, tipo, guide, pre, post, tips, interviews, interview, linked, available, areas } = props;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const iid = interview?.id ?? null;
  const readOnly = !iid;

  const steps = useMemo<Step[]>(
    () => [{ kind: "pre" }, ...guide.secciones.map((_, index) => ({ kind: "section" as const, index })), { kind: "post" }, { kind: "rubrica" }],
    [guide],
  );
  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx];
  const sectionIdx = step.kind === "section" ? step.index : null;

  /* ───────── Respuestas con guardado automático ───────── */
  const [answers, setAnswers] = useState(props.initialAnswers);
  const pending = useRef<Record<string, LiveAnswer>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [unsaved, setUnsaved] = useState(0);
  const [inFlight, setInFlight] = useState(0);
  const [failed, setFailed] = useState(false);
  const retry = useRef<(key: string) => void>(() => {});
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const flush = useCallback(async (key: string) => {
    clearTimeout(timers.current[key]);
    const a = pending.current[key];
    if (!a || !iid) return;
    delete pending.current[key];
    setUnsaved(Object.keys(pending.current).length);
    setInFlight((n) => n + 1);
    try {
      await saveAnswerAction(clientId, iid, key, a.respuesta, a.no_aplica);
      setFailed(false);
    } catch {
      setFailed(true);
      if (!pending.current[key]) pending.current[key] = a;
      setUnsaved(Object.keys(pending.current).length);
      timers.current[key] = setTimeout(() => retry.current(key), 5000);
    } finally {
      setInFlight((n) => n - 1);
    }
  }, [clientId, iid]);

  useEffect(() => { retry.current = (key) => void flush(key); }, [flush]);

  const flushAll = useCallback(async () => {
    await Promise.all(Object.keys(pending.current).map((k) => flush(k)));
  }, [flush]);

  const change = useCallback((key: string, patch: Partial<LiveAnswer>) => {
    if (!iid) return;
    const next = { ...(pending.current[key] ?? answersRef.current[key] ?? EMPTY), ...patch };
    pending.current[key] = next;
    setAnswers((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY), ...patch } }));
    setUnsaved(Object.keys(pending.current).length);
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => void flush(key), patch.respuesta !== undefined ? 800 : 50);
  }, [iid, flush]);

  /* ───────── Cronómetro por sección ───────── */
  const [secs, setSecs] = useState(props.initialTiming);
  const secsRef = useRef(secs);
  useEffect(() => { secsRef.current = secs; }, [secs]);
  const [running, setRunning] = useState(false);

  const persistTiming = useCallback((idx: number | null) => {
    if (idx === null || !iid) return;
    const v = secsRef.current[idx];
    if (v) void saveTimingAction(clientId, iid, idx, v).catch(() => {});
  }, [clientId, iid]);

  useEffect(() => {
    if (!running || sectionIdx === null) return;
    const tick = setInterval(() => setSecs((s) => ({ ...s, [sectionIdx]: (s[sectionIdx] ?? 0) + 1 })), 1000);
    const save = setInterval(() => persistTiming(sectionIdx), 30000);
    return () => { clearInterval(tick); clearInterval(save); persistTiming(sectionIdx); };
  }, [running, sectionIdx, persistTiming]);

  /* Guardar todo al salir de la pestaña o cerrar */
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") { void flushAll(); persistTiming(sectionIdx); } };
    const onUnload = () => { void flushAll(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("beforeunload", onUnload); };
  }, [flushAll, persistTiming, sectionIdx]);

  /* Atajos: Alt + ← / → */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === "ArrowRight") { e.preventDefault(); setStepIdx((i) => Math.min(i + 1, steps.length - 1)); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setStepIdx((i) => Math.max(i - 1, 0)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps.length]);

  /* ───────── Checklists ───────── */
  const [checks, setChecks] = useState(() => new Set(props.initialChecks));
  function toggle(itemKey: string, done: boolean) {
    if (!iid) return;
    setChecks((prev) => { const n = new Set(prev); if (done) n.add(itemKey); else n.delete(itemKey); return n; });
    void toggleCheckAction(clientId, iid, itemKey, done).catch(() => {
      setChecks((prev) => { const n = new Set(prev); if (done) n.delete(itemKey); else n.add(itemKey); return n; });
    });
  }

  /* ───────── Avance ───────── */
  const isDone = (a?: LiveAnswer) => !!a && (a.no_aplica || a.respuesta.trim() !== "");
  const sectionStats = guide.secciones.map((s, si) => {
    const done = s.preguntas.filter((_, qi) => isDone(answers[keyOf(si, qi)])).length;
    return { total: s.preguntas.length, done };
  });
  const totalQ = sectionStats.reduce((n, s) => n + s.total, 0);
  const totalDone = sectionStats.reduce((n, s) => n + s.done, 0);
  const totalSecs = Object.values(secs).reduce((n, v) => n + v, 0);

  const status = readOnly ? null : failed ? "Sin conexión, reintentando…" : unsaved > 0 || inFlight > 0 ? "Guardando…" : "Guardado ✓";

  /* ───────── Finalizar ───────── */
  const [finished, setFinished] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  async function finish() {
    if (!iid) return;
    setFinishError(null);
    setRunning(false);
    try {
      await flushAll();
      persistTiming(sectionIdx);
      await finishInterviewAction(clientId, iid, totalSecs >= 60 ? totalSecs / 60 : null);
      setFinished(true);
      startTransition(() => router.refresh());
    } catch (e) {
      setFinishError(e instanceof Error ? e.message : "No se pudo finalizar");
    }
  }

  function goTo(i: number) { setStepIdx(i); window.scrollTo({ top: 0, behavior: "smooth" }); }

  /* ───────── Render ───────── */
  const stepLabel = (s: Step) =>
    s.kind === "pre" ? "Antes de la reunión" : s.kind === "post" ? "Cierre y después" : s.kind === "rubrica" ? "Rúbrica" : guide.secciones[s.index].titulo;

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="no-print sticky top-0 z-20 -mx-1 space-y-2 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {interviews.length > 0 && (
            <select aria-label="Entrevista" value={iid ?? ""} onChange={(e) => { void flushAll(); router.push(`?tipo=${tipo}&entrevista=${e.target.value}`); }}
              className="h-8 max-w-64 rounded-lg border border-input bg-transparent px-2 text-sm">
              {interviews.map((i) => <option key={i.id} value={i.id} className="bg-card">{i.label}</option>)}
            </select>
          )}
          {interview && (
            <Badge variant={interview.estado === "realizada" || finished ? "default" : "secondary"}>
              {finished ? "realizada" : interview.estado}
            </Badge>
          )}
          <span className="font-mono text-xs text-muted-foreground">{totalDone}/{totalQ} preguntas</span>
          {!readOnly && <span className="font-mono text-xs text-muted-foreground">⏱ {mmss(totalSecs)} / {guide.secciones.reduce((n, s) => n + s.minutos, 0)} min</span>}
          <span className="ml-auto flex items-center gap-3">
            {status && <span aria-live="polite" className={cn("text-xs", failed ? "text-destructive" : "text-muted-foreground")}>{status}</span>}
            <Button variant="outline" size="sm" onClick={() => window.print()}>Imprimir / PDF</Button>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={totalDone} aria-valuemax={totalQ}>
          <div className="h-full bg-primary transition-all" style={{ width: `${totalQ ? (totalDone / totalQ) * 100 : 0}%` }} />
        </div>
      </div>

      {readOnly && (
        <p className="no-print rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Estás viendo el guion en modo lectura. Elige o crea una entrevista de este tipo para registrar respuestas, tiempos y checklists.
        </p>
      )}

      <div className="no-print grid gap-4 lg:grid-cols-[16rem_1fr]">
        {/* Menú de pasos */}
        <nav aria-label="Secciones del guion" className="flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-24 lg:flex-col lg:self-start lg:overflow-visible">
          {steps.map((s, i) => {
            const st = s.kind === "section" ? sectionStats[s.index] : null;
            const complete = st ? st.done === st.total : s.kind === "pre" ? pre.every((_, k) => checks.has(`pre:${k}`)) : s.kind === "post" ? post.every((_, k) => checks.has(`post:${k}`)) : false;
            const planned = s.kind === "section" ? guide.secciones[s.index].minutos : 0;
            const spent = s.kind === "section" ? secs[s.index] ?? 0 : 0;
            return (
              <button key={i} type="button" onClick={() => goTo(i)} aria-current={i === stepIdx ? "step" : undefined}
                className={cn("flex min-w-44 items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors lg:min-w-0",
                  i === stepIdx ? "border-primary bg-accent" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border text-[10px]", complete && "border-primary bg-primary text-primary-foreground")}>
                  {complete ? "✓" : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug">{stepLabel(s)}</span>
                  {st && (
                    <span className="mt-0.5 flex gap-2 font-mono text-[11px] text-muted-foreground">
                      <span>{st.done}/{st.total}</span>
                      {!readOnly && <span className={cn(spent > planned * 60 && "text-destructive")}>{mmss(spent)}/{planned}m</span>}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          <p className="hidden px-3 pt-2 text-[11px] text-muted-foreground lg:block">Atajo: Alt + ← / → para cambiar de sección.</p>
        </nav>

        {/* Contenido del paso */}
        <div className="min-w-0 space-y-4">
          {step.kind === "pre" && (
            <>
              <Checklist title="Antes de la reunión" items={pre} prefix="pre" checks={checks} onToggle={toggle} disabled={readOnly} />
              <div className="rounded-xl border bg-card p-4">
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">Consejos de entrevista</h2>
                <ul className="list-disc space-y-1 pl-5 text-sm">{tips.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            </>
          )}

          {step.kind === "section" && (() => {
            const s = guide.secciones[step.index];
            const planned = s.minutos * 60;
            const spent = secs[step.index] ?? 0;
            return (
              <>
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold">{s.titulo}</h2>
                      <p className="text-sm text-muted-foreground">{s.objetivo}</p>
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-2">
                        <span className={cn("font-mono text-lg tabular-nums", spent > planned && "text-destructive")}>{mmss(spent)}</span>
                        <span className="font-mono text-xs text-muted-foreground">/ {s.minutos} min</span>
                        <Button size="sm" variant={running ? "secondary" : "default"} onClick={() => setRunning((r) => !r)}>
                          {running ? "Pausar" : spent > 0 ? "Reanudar" : "Iniciar"}
                        </Button>
                      </div>
                    )}
                  </div>
                  {!readOnly && spent > planned && <p className="mt-2 text-xs text-destructive">Te pasaste {mmss(spent - planned)} del tiempo planificado para esta sección.</p>}
                </div>

                <ol className="space-y-3">
                  {s.preguntas.map((q, qi) => {
                    const key = keyOf(step.index, qi);
                    const a = answers[key] ?? EMPTY;
                    const done = isDone(a);
                    return (
                      <li key={`${iid}-${key}`} className={cn("rounded-xl border bg-card p-4 transition-colors", done && "border-primary/40")}>
                        <div className="flex gap-3">
                          <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border font-mono text-xs", done && "border-primary bg-primary text-primary-foreground")}>
                            {done ? "✓" : qi + 1}
                          </span>
                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="text-base font-medium leading-snug">{q.texto}</p>
                            {q.sondeo && (
                              <details className="text-sm text-muted-foreground">
                                <summary className="cursor-pointer text-xs hover:text-foreground">Ver sondeo</summary>
                                <p className="mt-1">{q.sondeo}</p>
                              </details>
                            )}
                            {q.campo && <Badge variant="secondary">→ {q.campo}</Badge>}
                            {!readOnly && (
                              <>
                                <Textarea value={a.respuesta} disabled={a.no_aplica} rows={3} aria-label={`Respuesta a: ${q.texto}`}
                                  placeholder={a.no_aplica ? "Marcada como «no aplica»" : "Escribe aquí lo que respondió la persona"}
                                  // Los manejadores solo se ejecutan en eventos, no durante el render.
                                  // eslint-disable-next-line react-hooks/refs
                                  onChange={(e) => change(key, { respuesta: e.target.value })}
                                  // eslint-disable-next-line react-hooks/refs
                                  onBlur={() => void flush(key)} />
                                <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                                  <input type="checkbox" checked={a.no_aplica} onChange={(e) => change(key, { no_aplica: e.target.checked })} />
                                  No aplica / no se habló
                                </label>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {!readOnly && iid && (
                  <ProcessesCard clientId={clientId} interviewId={iid} defaultAreaId={interview?.area_id ?? null}
                    linked={linked} available={available} areas={areas}
                    openByDefault={/inventario|detalle|recorrido|tareas/i.test(s.titulo)} />
                )}
              </>
            );
          })()}

          {step.kind === "post" && (
            <>
              <Checklist title="Después de la reunión (dentro de 24 horas)" items={post} prefix="post" checks={checks} onToggle={toggle} disabled={readOnly} />
              {!readOnly && (
                <div className="space-y-3 rounded-xl border bg-card p-4">
                  <h2 className="text-lg font-semibold">Finalizar entrevista</h2>
                  <ul className="space-y-1 text-sm">
                    {guide.secciones.map((s, si) => {
                      const st = sectionStats[si];
                      return (
                        <li key={si} className="flex items-center justify-between gap-2">
                          <button type="button" onClick={() => goTo(si + 1)} className="text-left hover:text-primary">{s.titulo}</button>
                          <span className={cn("font-mono text-xs", st.done < st.total ? "text-destructive" : "text-muted-foreground")}>
                            {st.done}/{st.total} · {mmss(secs[si] ?? 0)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    Procesos vinculados: <span className="font-mono text-foreground">{linked.length}</span>. Tiempo total medido: <span className="font-mono text-foreground">{mmss(totalSecs)}</span>
                    {totalSecs >= 60 ? " (se guardará como duración de la entrevista)." : "."}
                  </p>
                  {finishError && <p className="text-sm text-destructive">{finishError}</p>}
                  {finished || interview?.estado === "realizada" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge>Entrevista realizada</Badge>
                      <Link href={`/clientes/${clientId}/procesos`} className="text-sm text-primary hover:underline">Ir a procesos →</Link>
                      <Link href={`/clientes/${clientId}/mediciones`} className="text-sm text-primary hover:underline">Ir a mediciones →</Link>
                      <Button variant="outline" size="sm" onClick={() => void finish()}>Guardar de nuevo</Button>
                    </div>
                  ) : (
                    <Button onClick={() => void finish()}>Finalizar entrevista</Button>
                  )}
                </div>
              )}
            </>
          )}

          {step.kind === "rubrica" && props.children}

          {/* Navegación */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" disabled={stepIdx === 0} onClick={() => goTo(stepIdx - 1)}>← Anterior</Button>
            <span className="text-xs text-muted-foreground">{stepIdx + 1} de {steps.length}</span>
            <Button disabled={stepIdx === steps.length - 1} onClick={() => goTo(stepIdx + 1)}>Siguiente →</Button>
          </div>
        </div>
      </div>

      {/* Vista de impresión: preguntas y respuestas, sin controles */}
      <div className="print-only space-y-5">
        <h2 className="text-xl font-semibold">{guide.titulo}</h2>
        {interviews.find((i) => i.id === iid) && <p className="text-sm">{interviews.find((i) => i.id === iid)!.label}</p>}
        {guide.secciones.map((s, si) => (
          <section key={si} className="break-inside-avoid-page space-y-2">
            <h3 className="font-semibold">{s.titulo}</h3>
            <ol className="space-y-2 text-sm">
              {s.preguntas.map((q, qi) => {
                const a = answers[keyOf(si, qi)];
                return (
                  <li key={qi} className="break-inside-avoid">
                    <p className="font-medium">{qi + 1}. {q.texto}</p>
                    <p className="whitespace-pre-wrap pl-4">{a?.no_aplica ? "No aplica / no se habló" : a?.respuesta?.trim() || "—"}</p>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

function Checklist({ title, items, prefix, checks, onToggle, disabled }: {
  title: string; items: string[]; prefix: "pre" | "post"; checks: Set<string>; onToggle: (k: string, done: boolean) => void; disabled: boolean;
}) {
  const done = items.filter((_, i) => checks.has(`${prefix}:${i}`)).length;
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        <span className="font-mono text-xs text-muted-foreground">{done}/{items.length}</span>
      </div>
      <ul className="space-y-1">
        {items.map((t, i) => {
          const k = `${prefix}:${i}`;
          return (
            <li key={k}>
              <label className={cn("flex cursor-pointer items-start gap-2 rounded-md p-1.5 text-sm hover:bg-muted", checks.has(k) && "text-muted-foreground line-through")}>
                <input type="checkbox" className="mt-1" disabled={disabled} checked={checks.has(k)} onChange={(e) => onToggle(k, e.target.checked)} />
                <span>{t}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProcessesCard({ clientId, interviewId, defaultAreaId, linked, available, areas, openByDefault }: {
  clientId: string; interviewId: string; defaultAreaId: string | null; linked: Opt[]; available: Opt[]; areas: Opt[]; openByDefault: boolean;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [names, setNames] = useState("");
  const [areaId, setAreaId] = useState(defaultAreaId ?? areas[0]?.id ?? "");
  const [linkId, setLinkId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<void>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try { await fn(); after?.(); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    });
  }

  return (
    <details open={openByDefault} className="rounded-xl border bg-card">
      <summary className="flex cursor-pointer items-center justify-between gap-2 p-3 text-sm font-medium">
        <span>Procesos de esta entrevista</span>
        <Badge variant="outline">{linked.length}</Badge>
      </summary>
      <div className="space-y-3 border-t p-3">
        {linked.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {linked.map((p) => (
              <li key={p.id} className="flex items-center gap-1 rounded-md border px-2 py-0.5">
                <Link href={`/clientes/${clientId}/procesos/${p.id}`} target="_blank" className="hover:text-primary">{p.nombre} ↗</Link>
                <button type="button" title="Quitar vínculo" className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => run(() => unlinkProcessFromInterviewAction(clientId, interviewId, p.id))}>✕</button>
              </li>
            ))}
          </ul>
        )}
        {areas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Crea áreas en la pestaña Resumen para poder registrar procesos.</p>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground" htmlFor={`pn-${interviewId}`}>Tareas recurrentes que mencionó la persona (una por línea)</label>
            <Textarea id={`pn-${interviewId}`} rows={3} value={names} onChange={(e) => setNames(e.target.value)} placeholder={"Liquidación de sueldos\nControl de asistencia"} />
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Área" value={areaId} onChange={(e) => setAreaId(e.target.value)} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm">
                {areas.map((a) => <option key={a.id} value={a.id} className="bg-card">{a.nombre}</option>)}
              </select>
              <Button size="sm" disabled={busy || !names.trim()}
                onClick={() => run(() => createProcessesFromInterviewAction(clientId, interviewId, areaId, names.split("\n")), () => setNames(""))}>
                Crear como «Identificado» y vincular
              </Button>
            </div>
          </div>
        )}
        {available.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <select aria-label="Vincular proceso existente" value={linkId} onChange={(e) => setLinkId(e.target.value)} className="h-8 max-w-64 rounded-lg border border-input bg-transparent px-2 text-sm">
              <option value="" className="bg-card">Vincular un proceso existente…</option>
              {available.map((p) => <option key={p.id} value={p.id} className="bg-card">{p.nombre}</option>)}
            </select>
            <Button size="sm" variant="secondary" disabled={busy || !linkId}
              onClick={() => run(() => linkExistingProcessAction(clientId, interviewId, linkId), () => setLinkId(""))}>
              Vincular
            </Button>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </details>
  );
}
