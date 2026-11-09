"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Guide, GuideQuestion } from "@/lib/guide";
import type { Freq, InterviewTask, Opt, ProcessFields, ProcessStep, TaskPatch } from "@/lib/types";
import {
  addTasksAction, createProcessesFromInterviewAction, finishInterviewAction, linkExistingProcessAction,
  removeTaskAction, saveAnswerAction, saveTimingAction, toggleCheckAction, unlinkProcessFromInterviewAction, updateTaskAction,
} from "@/app/(panel)/clientes/[id]/guion/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DATA_STATE, FREQ } from "@/lib/labels";
import { formatRange, summarize } from "@/lib/process-map";
import { sheetChecks, VECES_POR_FRECUENCIA } from "@/lib/process-sheet";
import { ProcessDiagram } from "@/components/process-diagram";
import { ProcessSheet, type SipocSuggestions } from "@/components/process-sheet";
import { TaskInventory } from "@/components/task-inventory";
import { useProcessFields } from "@/components/use-process-fields";
import { useProcessSteps } from "@/components/use-process-steps";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type LiveAnswer = { respuesta: string; no_aplica: boolean };
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
  initialTasks: InterviewTask[];
  initialSteps: Record<string, ProcessStep[]>;
  initialFields: Record<string, ProcessFields>;
  measuredIds: string[];
  sipocSuggestions: SipocSuggestions;
  peopleNames: string[];
  linked: Opt[]; available: Opt[]; areas: Opt[];
  children: React.ReactNode;
};

const EMPTY: LiveAnswer = { respuesta: "", no_aplica: false };
/** Clave de una pregunta; en secciones de detalle lleva el id de la tarea. */
const keyOf = (s: number, q: number, task?: string) => (task ? `s${s}q${q}:${task}` : `s${s}q${q}`);
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
  const [tasks, setTasks] = useState(props.initialTasks);
  const taskPending = useRef<Record<string, TaskPatch>>({});
  const taskTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const retryTask = useRef<(pid: string) => void>(() => {});
  const pending = useRef<Record<string, LiveAnswer>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [unsaved, setUnsaved] = useState(0);
  const [inFlight, setInFlight] = useState(0);
  const [failed, setFailed] = useState(false);
  const retry = useRef<(key: string) => void>(() => {});
  const recount = useCallback(() => setUnsaved(Object.keys(pending.current).length + Object.keys(taskPending.current).length), []);
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const flush = useCallback(async (key: string) => {
    clearTimeout(timers.current[key]);
    const a = pending.current[key];
    if (!a || !iid) return;
    delete pending.current[key];
    recount();
    setInFlight((n) => n + 1);
    try {
      await saveAnswerAction(clientId, iid, key, a.respuesta, a.no_aplica);
      setFailed(false);
    } catch {
      setFailed(true);
      if (!pending.current[key]) pending.current[key] = a;
      recount();
      timers.current[key] = setTimeout(() => retry.current(key), 5000);
    } finally {
      setInFlight((n) => n - 1);
    }
  }, [clientId, iid, recount]);

  const flushTask = useCallback(async (pid: string) => {
    clearTimeout(taskTimers.current[pid]);
    const p = taskPending.current[pid];
    if (!p || !iid) return;
    delete taskPending.current[pid];
    recount();
    setInFlight((n) => n + 1);
    try {
      await updateTaskAction(clientId, iid, pid, p);
      setFailed(false);
    } catch {
      setFailed(true);
      taskPending.current[pid] = { ...p, ...taskPending.current[pid] };
      recount();
      taskTimers.current[pid] = setTimeout(() => retryTask.current(pid), 5000);
    } finally {
      setInFlight((n) => n - 1);
    }
  }, [clientId, iid, recount]);

  useEffect(() => { retry.current = (key) => void flush(key); }, [flush]);
  useEffect(() => { retryTask.current = (pid) => void flushTask(pid); }, [flushTask]);

  /** Envuelve una escritura de otro módulo para que cuente en el indicador «Guardando…». */
  const track = useCallback(async <T,>(p: Promise<T>) => {
    setInFlight((n) => n + 1);
    try { const r = await p; setFailed(false); return r; } catch (e) { setFailed(true); throw e; } finally { setInFlight((n) => n - 1); }
  }, []);
  const stepsApi = useProcessSteps(clientId, props.initialSteps, track);
  const fieldsApi = useProcessFields(clientId, props.initialFields, track);
  const [measured, setMeasured] = useState(() => new Set(props.measuredIds));
  const flushSteps = stepsApi.flushAll;
  const flushFields = fieldsApi.flushAll;

  const flushAll = useCallback(async () => {
    await Promise.all([
      ...Object.keys(pending.current).map((k) => flush(k)),
      ...Object.keys(taskPending.current).map((k) => flushTask(k)),
      flushSteps(),
      flushFields(),
    ]);
  }, [flush, flushTask, flushSteps, flushFields]);

  const patchTask = useCallback((pid: string, patch: TaskPatch, delay = 0) => {
    if (!iid) return;
    setTasks((prev) => prev.map((t) => (t.process_id === pid ? { ...t, ...patch } : t)));
    taskPending.current[pid] = { ...taskPending.current[pid], ...patch };
    recount();
    clearTimeout(taskTimers.current[pid]);
    taskTimers.current[pid] = setTimeout(() => void flushTask(pid), delay);
  }, [iid, recount, flushTask]);

  async function addTasks(names: string[], areaId: string, frecuencia: Freq | null) {
    if (!iid) return;
    const created = await addTasksAction(clientId, iid, areaId, names, frecuencia);
    setTasks((prev) => [...prev, ...created]);
    startTransition(() => router.refresh());
  }
  async function removeTask(pid: string) {
    if (!iid) return;
    clearTimeout(taskTimers.current[pid]);
    delete taskPending.current[pid];
    recount();
    await removeTaskAction(clientId, iid, pid);
    setTasks((prev) => prev.filter((t) => t.process_id !== pid));
    startTransition(() => router.refresh());
  }
  async function linkTask(pid: string) {
    if (!iid) return;
    const proc = available.find((p) => p.id === pid);
    await linkExistingProcessAction(clientId, iid, pid);
    if (proc) {
      setTasks((prev) => [...prev, {
        process_id: pid, nombre: proc.nombre, area_id: proc.area_id ?? null, frecuencia: null, quien_hace: null,
        pesa_tiempo: false, molesta_errores: false, nota: null, para_detalle: false,
      }]);
    }
    startTransition(() => router.refresh());
  }

  const change = useCallback((key: string, patch: Partial<LiveAnswer>) => {
    if (!iid) return;
    const next = { ...(pending.current[key] ?? answersRef.current[key] ?? EMPTY), ...patch };
    pending.current[key] = next;
    setAnswers((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY), ...patch } }));
    recount();
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => void flush(key), patch.respuesta !== undefined ? 800 : 50);
  }, [iid, flush, recount]);

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
  const qDone = (q: GuideQuestion, k: string) =>
    q.control === "check" || q.control === "check_nota" ? checks.has(k)
      : q.control === "sino" ? answers[k]?.respuesta === "si" || answers[k]?.respuesta === "no"
        : isDone(answers[k]);
  const starred = tasks.filter((t) => t.para_detalle);
  const sectionStats = guide.secciones.map((s, si) => {
    if (s.kind === "inventario") return { total: tasks.length, done: tasks.filter((t) => t.frecuencia).length };
    if (s.kind === "detalle") {
      const checksOf = starred.map((t) => sheetChecks(stepsApi.stepsOf(t.process_id), fieldsApi.fieldsOf(t.process_id), measured.has(t.process_id)));
      return { total: checksOf.length * 5, done: checksOf.reduce((n, c) => n + c.filter((x) => x.done).length, 0) };
    }
    const targets: (string | undefined)[] = [undefined];
    let done = 0;
    for (const tg of targets) s.preguntas.forEach((q, qi) => { if (qDone(q, keyOf(si, qi, tg))) done++; });
    return { total: s.preguntas.length * targets.length, done };
  });
  const [detailSel, setDetailSel] = useState<string | null>(null);
  const detailId = detailSel && starred.some((t) => t.process_id === detailSel) ? detailSel : starred[0]?.process_id ?? null;
  const totalQ = sectionStats.reduce((n, s) => n + s.total, 0);
  const totalDone = sectionStats.reduce((n, s) => n + s.done, 0);
  const totalSecs = Object.values(secs).reduce((n, v) => n + v, 0);

  const status = readOnly ? null : failed ? "Sin conexión, reintentando…" : unsaved + stepsApi.pendingCount + fieldsApi.pendingCount > 0 || inFlight > 0 ? "Guardando…" : "Guardado ✓";

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
          <span className="font-mono text-xs text-muted-foreground">{totalDone}/{totalQ} respondidos</span>
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
            const complete = st ? st.total > 0 && st.done === st.total : s.kind === "pre" ? pre.every((_, k) => checks.has(`pre:${k}`)) : s.kind === "post" ? post.every((_, k) => checks.has(`post:${k}`)) : false;
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

                {s.kind === "checklist" ? (
                  <div className="rounded-xl border bg-card p-4">
                    <ul className="space-y-2">
                      {s.preguntas.map((q, qi) => {
                        const k = keyOf(step.index, qi);
                        return (
                          <li key={`${iid}-${k}`}><ControlItem q={q} k={k} a={answers[k] ?? EMPTY} checked={checks.has(k)} readOnly={readOnly}
                            onChange={change} onFlush={flush} onToggle={toggle} /></li>
                        );
                      })}
                    </ul>
                  </div>
                ) : s.kind === "inventario" ? (
                  <>
                    <details open className="rounded-xl border bg-card p-4">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Preguntas guía para la conversación</summary>
                      <ul className="mt-3 space-y-2 text-sm">
                        {s.preguntas.map((q, qi) => (
                          <li key={qi} className="space-y-1">
                            <p>{qi + 1}. {q.texto}</p>
                            {q.sondeo && <p className="text-xs text-muted-foreground">Sondeo: {q.sondeo}</p>}
                          </li>
                        ))}
                      </ul>
                    </details>
                    {readOnly ? (
                      <p className="text-sm text-muted-foreground">Elige una entrevista para registrar las tareas.</p>
                    ) : (
                      <TaskInventory tasks={tasks} areas={areas} defaultAreaId={interview?.area_id ?? null} peopleNames={props.peopleNames}
                        available={available.filter((p) => !tasks.some((t) => t.process_id === p.id))}
                        onAdd={addTasks} onPatch={patchTask} onRemove={removeTask} onLink={linkTask} />
                    )}
                    {(() => {
                      const legacy = s.preguntas.map((q, qi) => ({ q, a: answers[keyOf(step.index, qi)] })).filter((x) => x.a?.respuesta.trim());
                      return legacy.length > 0 && (
                        <details className="rounded-xl border bg-card p-4 text-sm">
                          <summary className="cursor-pointer text-xs text-muted-foreground">Notas guardadas antes en estas preguntas ({legacy.length})</summary>
                          <ul className="mt-2 space-y-2">
                            {legacy.map(({ q, a }, i) => <li key={i}><p className="text-xs text-muted-foreground">{q.texto}</p><p className="whitespace-pre-wrap">{a!.respuesta}</p></li>)}
                          </ul>
                        </details>
                      );
                    })()}
                  </>
                ) : s.kind === "detalle" ? (
                  <>
                    <details className="rounded-xl border bg-card p-4">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Preguntas guía para la conversación</summary>
                      <ul className="mt-3 space-y-2 text-sm">
                        {s.preguntas.map((q, qi) => (
                          <li key={qi} className="space-y-1">
                            <p>{qi + 1}. {q.texto}</p>
                            {q.sondeo && <p className="text-xs text-muted-foreground">Sondeo: {q.sondeo}</p>}
                          </li>
                        ))}
                      </ul>
                    </details>
                    {starred.length === 0 ? (
                      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                        Aún no elegiste tareas para detallar. Marca <b>⭐ Detallar</b> en el{" "}
                        <button type="button" className="text-primary hover:underline"
                          onClick={() => goTo(guide.secciones.findIndex((x) => x.kind === "inventario") + 1)}>inventario</button>
                        {" "}y aparecerán aquí, una por una.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
                          <span className="text-xs text-muted-foreground">Tarea que se está detallando:</span>
                          {starred.map((t) => {
                            const dn = sheetChecks(stepsApi.stepsOf(t.process_id), fieldsApi.fieldsOf(t.process_id), measured.has(t.process_id)).filter((x) => x.done).length;
                            return (
                              <button key={t.process_id} type="button" aria-pressed={detailId === t.process_id} onClick={() => setDetailSel(t.process_id)}
                                className={cn("rounded-md border px-2.5 py-1 text-sm", detailId === t.process_id ? "border-primary bg-accent" : "text-muted-foreground hover:text-foreground")}>
                                {t.nombre} <span className="font-mono text-[11px]">{dn}/5</span>
                              </button>
                            );
                          })}
                          {detailId && <Link href={`/clientes/${clientId}/procesos/${detailId}`} target="_blank" className="ml-auto text-xs text-primary hover:underline">Abrir ficha del proceso ↗</Link>}
                        </div>
                        {detailId && !readOnly && (() => {
                          const task = starred.find((t) => t.process_id === detailId);
                          return (
                            <ProcessSheet key={detailId} clientId={clientId} processId={detailId} name={task?.nombre}
                              steps={stepsApi.stepsOf(detailId)} fields={fieldsApi.fieldsOf(detailId)} stepsApi={stepsApi}
                              onFields={(p, d) => fieldsApi.patch(detailId, p, d)}
                              actors={[...new Set([...props.peopleNames, "Sistema", "Cliente", "Proveedor"])]}
                              tools={[...new Set([...["Excel", "Correo", "WhatsApp", "Papel", "Sistema propio"], ...starred.flatMap((t) => stepsApi.stepsOf(t.process_id).map((x) => x.herramienta ?? ""))].filter(Boolean))]}
                              sipocSuggestions={props.sipocSuggestions}
                              defaultVeces={task?.frecuencia ? VECES_POR_FRECUENCIA[task.frecuencia] : null}
                              defaultMetodo={tipo === "trabajador" ? "cronometrado" : "declarado"}
                              measured={measured.has(detailId)} onMeasured={() => setMeasured((prev) => new Set(prev).add(detailId))} />
                          );
                        })()}
                      </>
                    )}
                    {(() => {
                      const legacy = Object.entries(answers)
                        .filter(([k, a]) => k.startsWith(`s${step.index}q`) && a.respuesta.trim())
                        .map(([k, a]) => {
                          const [base, tid] = k.split(":");
                          return { k, q: s.preguntas[Number(base.split("q")[1])]?.texto ?? base, tarea: tid ? tasks.find((t) => t.process_id === tid)?.nombre : undefined, r: a.respuesta };
                        });
                      return legacy.length > 0 && (
                        <details className="rounded-xl border bg-card p-4 text-sm">
                          <summary className="cursor-pointer text-xs text-muted-foreground">Notas guardadas antes en estas preguntas ({legacy.length})</summary>
                          <ul className="mt-2 space-y-2">
                            {legacy.map((x) => <li key={x.k}><p className="text-xs text-muted-foreground">{x.tarea ? `${x.tarea} · ` : ""}{x.q}</p><p className="whitespace-pre-wrap">{x.r}</p></li>)}
                          </ul>
                        </details>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <ol className="space-y-3">
                      {s.preguntas.map((q, qi) => {
                        const k = keyOf(step.index, qi);
                        return (
                          <li key={`${iid}-${k}`}><QuestionCard q={q} index={qi} k={k} a={answers[k] ?? EMPTY} readOnly={readOnly}
                            onChange={change} onFlush={flush} /></li>
                        );
                      })}
                    </ol>
                    {!readOnly && iid && (
                      <ProcessesCard clientId={clientId} interviewId={iid} defaultAreaId={interview?.area_id ?? null}
                        linked={linked} available={available} areas={areas} openByDefault={false} />
                    )}
                  </>
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
        {guide.secciones.map((s, si) => {
          const answerText = (q: GuideQuestion, k: string) => {
            const a = answers[k];
            if (q.control === "check") return checks.has(k) ? "☑ Hecho" : "☐ Pendiente";
            if (q.control === "sino") return a?.respuesta === "si" ? "Sí" : a?.respuesta === "no" ? "No" : "—";
            if (q.control === "check_nota") return `${checks.has(k) ? "☑" : "☐"} ${a?.respuesta?.trim() ?? ""}`;
            return a?.no_aplica ? "No aplica / no se habló" : a?.respuesta?.trim() || "—";
          };
          const targets: (InterviewTask | undefined)[] = s.kind === "detalle" && starred.length ? starred : [undefined];
          return (
            <section key={si} className="break-inside-avoid-page space-y-2">
              <h3 className="font-semibold">{s.titulo}</h3>
              {s.kind === "inventario" ? (
                tasks.length === 0 ? <p className="text-sm">—</p> : (
                  <table className="w-full border-collapse text-sm">
                    <thead><tr className="text-left"><th>Tarea</th><th>Frecuencia</th><th>Quién</th><th>Pesa</th><th>Molesta</th><th>Detallar</th></tr></thead>
                    <tbody>
                      {tasks.map((t) => (
                        <tr key={t.process_id} className="border-t align-top">
                          <td>{t.nombre}{t.nota ? ` — ${t.nota}` : ""}</td><td>{t.frecuencia ? FREQ[t.frecuencia] : "—"}</td>
                          <td>{t.quien_hace ?? "—"}</td><td>{t.pesa_tiempo ? "Sí" : ""}</td><td>{t.molesta_errores ? "Sí" : ""}</td><td>{t.para_detalle ? "⭐" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : s.kind === "detalle" ? (
                starred.length === 0 ? <p className="text-sm">—</p> : starred.map((tg) => {
                  const st = stepsApi.stepsOf(tg.process_id), f = fieldsApi.fieldsOf(tg.process_id), sm = summarize(st);
                  const list = (l: string[]) => (l.length ? l.join(", ") : "—");
                  return (
                    <div key={tg.process_id} className="break-inside-avoid space-y-2 text-sm">
                      <p className="font-medium underline">Tarea: {tg.nombre}</p>
                      <p><b>Disparador:</b> {f.disparador ?? "—"} · <b>Datos:</b> {f.estado_datos ? DATA_STATE[f.estado_datos] : "—"} · <b>Tiempo:</b> {formatRange(sm.minutosMin, sm.minutosMax) || "—"}</p>
                      <p><b>Proveedores:</b> {list(f.sipoc.proveedores)} · <b>Entradas:</b> {list(f.sipoc.entradas)} · <b>Salidas:</b> {list(f.sipoc.salidas)} · <b>Clientes:</b> {list(f.sipoc.clientes)}</p>
                      <p><b>Herramientas:</b> {list(sm.herramientas)} · <b>Excepciones:</b> {list(f.excepciones)}</p>
                      {(sm.problemas.length > 0 || f.problemas) && (
                        <p><b>Problemas:</b> {[...sm.problemas.map((p) => `${p.texto}${p.nota ? ` (${p.nota})` : ""}`), f.problemas].filter(Boolean).join("; ")}</p>
                      )}
                      {st.length > 0 && (
                        <>
                          <ProcessDiagram steps={st} label={`Diagrama de ${tg.nombre}`} />
                          <ol className="list-decimal pl-5">{st.map((x) => <li key={x.id}>{x.texto}{x.problema ? " ⚠" : ""}{x.nota ? ` — ${x.nota}` : ""}</li>)}</ol>
                        </>
                      )}
                    </div>
                  );
                })
              ) : targets.map((tg) => (
                <div key={tg?.process_id ?? "general"} className="space-y-2">
                  {tg && <p className="text-sm font-medium underline">Tarea: {tg.nombre}</p>}
                  {tg && stepsApi.stepsOf(tg.process_id).length > 0 && (
                    <div className="break-inside-avoid">
                      <ProcessDiagram steps={stepsApi.stepsOf(tg.process_id)} label={`Diagrama de ${tg.nombre}`} />
                      <ol className="list-decimal pl-5 text-sm">{stepsApi.stepsOf(tg.process_id).map((x) => <li key={x.id}>{x.texto}{x.problema ? " ⚠" : ""}{x.nota ? ` — ${x.nota}` : ""}</li>)}</ol>
                    </div>
                  )}
                  <ol className="space-y-2 text-sm">
                    {s.preguntas.map((q, qi) => (
                      <li key={qi} className="break-inside-avoid">
                        <p className="font-medium">{qi + 1}. {q.texto}</p>
                        <p className="whitespace-pre-wrap pl-4">{answerText(q, keyOf(si, qi, tg?.process_id))}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function QuestionCard({ q, index, k, a, readOnly, onChange, onFlush }: {
  q: GuideQuestion; index: number; k: string; a: LiveAnswer; readOnly: boolean;
  onChange: (key: string, patch: Partial<LiveAnswer>) => void; onFlush: (key: string) => void;
}) {
  const done = !!a && (a.no_aplica || a.respuesta.trim() !== "");
  return (
    <div className={cn("rounded-xl border bg-card p-4 transition-colors", done && "border-primary/40")}>
      <div className="flex gap-3">
        <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border font-mono text-xs", done && "border-primary bg-primary text-primary-foreground")}>
          {done ? "✓" : index + 1}
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
                onChange={(e) => onChange(k, { respuesta: e.target.value })} onBlur={() => onFlush(k)} />
              <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={a.no_aplica} onChange={(e) => onChange(k, { no_aplica: e.target.checked })} />
                No aplica / no se habló
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Ítem de checklist de acuerdos: casilla, Sí/No, o casilla con nota corta. */
function ControlItem({ q, k, a, checked, readOnly, onChange, onFlush, onToggle }: {
  q: GuideQuestion; k: string; a: LiveAnswer; checked: boolean; readOnly: boolean;
  onChange: (key: string, patch: Partial<LiveAnswer>) => void; onFlush: (key: string) => void; onToggle: (key: string, done: boolean) => void;
}) {
  if (q.control === "sino") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md p-1.5 text-sm">
        <span className="flex-1">{q.texto}</span>
        {(["si", "no"] as const).map((v) => (
          <button key={v} type="button" disabled={readOnly} aria-pressed={a.respuesta === v}
            onClick={() => onChange(k, { respuesta: a.respuesta === v ? "" : v })}
            className={cn("min-w-14 rounded-md border px-3 py-1 text-sm transition-colors", a.respuesta === v ? "border-primary bg-primary/15" : "text-muted-foreground hover:bg-muted")}>
            {v === "si" ? "Sí" : "No"}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1.5 rounded-md p-1.5">
      <label className={cn("flex cursor-pointer items-start gap-2 text-sm", checked && "text-muted-foreground")}>
        <input type="checkbox" className="mt-1 size-4" disabled={readOnly} checked={checked} onChange={(e) => onToggle(k, e.target.checked)} />
        <span>{q.texto}</span>
      </label>
      {q.control === "check_nota" && !readOnly && (
        <input value={a.respuesta} maxLength={500} aria-label="Nota" placeholder="Anota qué no debe quedar registrado (opcional)"
          onChange={(e) => onChange(k, { respuesta: e.target.value })} onBlur={() => onFlush(k)}
          className="ml-6 h-8 w-[calc(100%-1.5rem)] rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring" />
      )}
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
