"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { updateProcessFieldsAction } from "@/app/(panel)/clientes/[id]/procesos/fields-actions";
import { EMPTY_FIELDS } from "@/lib/process-sheet";
import type { FieldsPatch, ProcessFields } from "@/lib/types";
import { useSaveQueue, type Track } from "@/components/use-save-queue";

const merge = (a: FieldsPatch, b: FieldsPatch): FieldsPatch => ({
  ...a, ...b,
  sipoc: a.sipoc || b.sipoc ? { ...a.sipoc, ...b.sipoc } : undefined,
  ejemplos: a.ejemplos || b.ejemplos ? { ...a.ejemplos, ...b.ejemplos } : undefined,
});

/** Campos de la ficha rápida (disparador, SIPOC, datos, excepciones, problemas) de varios procesos, con guardado automático. */
export function useProcessFields(clientId: string, initial: Record<string, ProcessFields>, track: Track) {
  const [byProcess, setBy] = useState(initial);
  const [pendingCount, setPendingCount] = useState(0);
  const pending = useRef<Record<string, FieldsPatch>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const retry = useRef<(pid: string) => void>(() => {});
  const { enqueue, drain } = useSaveQueue(track);
  const recount = useCallback(() => setPendingCount(Object.keys(pending.current).length), []);

  const flush = useCallback(async (pid: string) => {
    clearTimeout(timers.current[pid]);
    const p = pending.current[pid];
    if (!p) return;
    delete pending.current[pid];
    recount();
    await enqueue(() => updateProcessFieldsAction(clientId, pid, p));
  }, [clientId, enqueue, recount]);
  useEffect(() => { retry.current = (pid) => void flush(pid); }, [flush]);

  const flushAll = useCallback(async () => {
    await Promise.all(Object.keys(pending.current).map((pid) => flush(pid)));
    await drain();
  }, [flush, drain]);

  const fieldsOf = (pid: string): ProcessFields => byProcess[pid] ?? EMPTY_FIELDS;

  const patch = useCallback((pid: string, p: FieldsPatch, delay = 0) => {
    setBy((prev) => {
      const cur = prev[pid] ?? EMPTY_FIELDS;
      const { sipoc, ejemplos, ...rest } = p;
      return { ...prev, [pid]: { ...cur, ...rest, sipoc: sipoc ? { ...cur.sipoc, ...sipoc } : cur.sipoc, ejemplos: ejemplos ? { ...cur.ejemplos, ...ejemplos } : cur.ejemplos } as ProcessFields };
    });
    pending.current[pid] = merge(pending.current[pid] ?? {}, p);
    recount();
    clearTimeout(timers.current[pid]);
    timers.current[pid] = setTimeout(() => retry.current(pid), delay);
  }, [recount]);

  return { fieldsOf, patch, flushAll, pendingCount };
}
