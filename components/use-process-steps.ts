"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addStepAction, removeStepAction, reorderStepsAction, updateStepAction,
} from "@/app/(panel)/clientes/[id]/procesos/steps-actions";
import type { ProcessStep, StepPatch } from "@/lib/types";

type Track = <T>(p: Promise<T>) => Promise<T>;
const sorted = (l: ProcessStep[]) => [...l].sort((a, b) => a.orden - b.orden);

/** Estado y guardado automático de los pasos de varios procesos. `track` informa el estado de guardado a la barra superior. */
export function useProcessSteps(clientId: string, initial: Record<string, ProcessStep[]>, track: Track) {
  const [byProcess, setBy] = useState(initial);
  const [pendingCount, setPendingCount] = useState(0);
  const pending = useRef<Record<string, { pid: string; patch: StepPatch }>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const retry = useRef<(stepId: string) => void>(() => {});
  const recount = useCallback(() => setPendingCount(Object.keys(pending.current).length), []);

  /** Las escrituras van en fila y se reintentan: un paso nuevo siempre se guarda antes de editarse. */
  const enqueue = useCallback((fn: () => Promise<unknown>) => {
    const run = async () => {
      let lastError: unknown;
      for (let i = 0; i < 3; i++) {
        try { return await track(fn()); } catch (e) { lastError = e; await new Promise((r) => setTimeout(r, 1500 * (i + 1))); }
      }
      throw lastError;
    };
    queue.current = queue.current.then(run, run);
    return queue.current.catch(() => {});
  }, [track]);

  const flushStep = useCallback(async (stepId: string) => {
    clearTimeout(timers.current[stepId]);
    const p = pending.current[stepId];
    if (!p) return;
    delete pending.current[stepId];
    recount();
    await enqueue(() => updateStepAction(clientId, p.pid, stepId, p.patch));
  }, [clientId, enqueue, recount]);
  useEffect(() => { retry.current = (id) => void flushStep(id); }, [flushStep]);

  const flushAll = useCallback(async () => {
    await Promise.all(Object.keys(pending.current).map((id) => flushStep(id)));
    await queue.current.catch(() => {});
  }, [flushStep]);

  const stepsOf = (pid: string) => sorted(byProcess[pid] ?? []);

  const addMany = useCallback((pid: string, textos: string[], base: Partial<Pick<ProcessStep, "tipo" | "actor" | "herramienta">> = {}) => {
    const texts = textos.map((t) => t.trim()).filter(Boolean);
    if (texts.length === 0) return;
    let orden = (byProcess[pid] ?? []).reduce((n, s) => Math.max(n, s.orden), -1) + 1;
    const created: ProcessStep[] = texts.map((texto) => ({
      id: crypto.randomUUID(), process_id: pid, orden: orden++, texto: texto.slice(0, 300),
      tipo: base.tipo ?? "accion", actor: base.actor?.trim() || null, herramienta: base.herramienta?.trim() || null,
      minutos_min: null, minutos_max: null, problema: false, nota: null,
    }));
    setBy((prev) => ({ ...prev, [pid]: [...(prev[pid] ?? []), ...created] }));
    for (const step of created) void enqueue(() => addStepAction(clientId, step));
  }, [byProcess, clientId, enqueue]);

  const patch = useCallback((pid: string, stepId: string, p: StepPatch, delay = 0) => {
    setBy((prev) => ({ ...prev, [pid]: (prev[pid] ?? []).map((s) => (s.id === stepId ? { ...s, ...p } : s)) }));
    pending.current[stepId] = { pid, patch: { ...pending.current[stepId]?.patch, ...p } };
    recount();
    clearTimeout(timers.current[stepId]);
    timers.current[stepId] = setTimeout(() => retry.current(stepId), delay);
  }, [recount]);

  const remove = useCallback((pid: string, stepId: string) => {
    clearTimeout(timers.current[stepId]);
    delete pending.current[stepId];
    recount();
    setBy((prev) => ({ ...prev, [pid]: (prev[pid] ?? []).filter((s) => s.id !== stepId) }));
    void enqueue(() => removeStepAction(clientId, pid, stepId));
  }, [clientId, enqueue, recount]);

  const reorder = useCallback((pid: string, ids: string[]) => {
    setBy((prev) => {
      const byId = new Map((prev[pid] ?? []).map((s) => [s.id, s]));
      return { ...prev, [pid]: ids.flatMap((id, orden) => { const s = byId.get(id); return s ? [{ ...s, orden }] : []; }) };
    });
    void enqueue(() => reorderStepsAction(clientId, pid, ids));
  }, [clientId, enqueue]);

  const move = useCallback((pid: string, stepId: string, dir: -1 | 1) => {
    const ids = sorted(byProcess[pid] ?? []).map((s) => s.id);
    const i = ids.indexOf(stepId), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder(pid, ids);
  }, [byProcess, reorder]);

  const duplicate = useCallback((pid: string, stepId: string) => {
    const list = sorted(byProcess[pid] ?? []);
    const i = list.findIndex((s) => s.id === stepId);
    if (i < 0) return;
    const copy: ProcessStep = { ...list[i], id: crypto.randomUUID(), orden: list.reduce((n, s) => Math.max(n, s.orden), 0) + 1 };
    const ids = list.map((s) => s.id);
    ids.splice(i + 1, 0, copy.id);
    setBy((prev) => ({ ...prev, [pid]: [...(prev[pid] ?? []), copy] }));
    void enqueue(() => addStepAction(clientId, copy));
    reorder(pid, ids);
  }, [byProcess, clientId, enqueue, reorder]);

  return { stepsOf, addMany, patch, remove, move, duplicate, flushAll, pendingCount };
}
