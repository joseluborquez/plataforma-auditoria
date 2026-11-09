"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addProblemAction, removeProblemAction, updateProblemAction } from "@/app/(panel)/clientes/[id]/guion/problems-actions";
import type { InterviewProblem, ProblemPatch, ProblemType } from "@/lib/types";
import { useSaveQueue, type Track } from "@/components/use-save-queue";

/** Problemas dichos en la entrevista, con guardado automático en fila. */
export function useProblems(clientId: string, interviewId: string | null, initial: InterviewProblem[], track: Track) {
  const [problems, setProblems] = useState(initial);
  const [pendingCount, setPendingCount] = useState(0);
  const pending = useRef<Record<string, ProblemPatch>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const retry = useRef<(id: string) => void>(() => {});
  const { enqueue, drain } = useSaveQueue(track);
  const recount = useCallback(() => setPendingCount(Object.keys(pending.current).length), []);

  const flush = useCallback(async (id: string) => {
    clearTimeout(timers.current[id]);
    const p = pending.current[id];
    if (!p || !interviewId) return;
    delete pending.current[id];
    recount();
    await enqueue(() => updateProblemAction(clientId, interviewId, id, p));
  }, [clientId, interviewId, enqueue, recount]);
  useEffect(() => { retry.current = (id) => void flush(id); }, [flush]);

  const flushAll = useCallback(async () => {
    await Promise.all(Object.keys(pending.current).map((id) => flush(id)));
    await drain();
  }, [flush, drain]);

  const add = useCallback((texto: string, base: { process_id: string | null; step_id?: string | null; tipo: ProblemType }) => {
    const text = texto.trim().slice(0, 500);
    if (!text || !interviewId) return;
    const problem: InterviewProblem = {
      id: crypto.randomUUID(), interview_id: interviewId, process_id: base.process_id, step_id: base.step_id ?? null,
      tipo: base.tipo, texto: text, nota: null,
    };
    setProblems((prev) => [...prev, problem]);
    void enqueue(() => addProblemAction(clientId, interviewId, {
      id: problem.id, process_id: problem.process_id, step_id: problem.step_id, tipo: problem.tipo, texto: problem.texto, nota: null,
    }));
  }, [clientId, interviewId, enqueue]);

  const patch = useCallback((id: string, p: ProblemPatch, delay = 0) => {
    setProblems((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
    pending.current[id] = { ...pending.current[id], ...p };
    recount();
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => retry.current(id), delay);
  }, [recount]);

  const remove = useCallback((id: string) => {
    if (!interviewId) return;
    clearTimeout(timers.current[id]);
    delete pending.current[id];
    recount();
    setProblems((prev) => prev.filter((x) => x.id !== id));
    void enqueue(() => removeProblemAction(clientId, interviewId, id));
  }, [clientId, interviewId, enqueue, recount]);

  return { problems, add, patch, remove, flushAll, pendingCount };
}
