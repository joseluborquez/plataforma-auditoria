"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addSourceAction, removeSourceAction, updateSourceAction, upsertToolAction } from "@/app/(panel)/clientes/[id]/procesos/readiness-actions";
import { toolKey } from "@/lib/readiness";
import type { ClientTool, ProcessSource, SourceFormat, SourcePatch, ToolAccess } from "@/lib/types";
import { useSaveQueue, type Track } from "@/components/use-save-queue";

export type ReadinessApi = {
  addSource: (pid: string, nombre: string, formato?: SourceFormat) => void;
  patchSource: (pid: string, id: string, p: SourcePatch, delay?: number) => void;
  removeSource: (pid: string, id: string) => void;
  patchTool: (nombre: string, p: Partial<Pick<ClientTool, "acceso" | "administra">>, delay?: number) => void;
};

/** Fuentes de conocimiento por proceso y herramientas del cliente, con guardado automático en fila. */
export function useReadiness(clientId: string, initialSources: Record<string, ProcessSource[]>, initialTools: ClientTool[], track: Track) {
  const [sources, setSources] = useState(initialSources);
  const [tools, setTools] = useState(initialTools);
  const [pendingCount, setPendingCount] = useState(0);
  const pendingSrc = useRef<Record<string, { pid: string; patch: SourcePatch }>>({});
  const pendingTool = useRef<Record<string, ClientTool>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const retry = useRef<(key: string) => void>(() => {});
  const { enqueue, drain } = useSaveQueue(track);
  const recount = useCallback(() => setPendingCount(Object.keys(pendingSrc.current).length + Object.keys(pendingTool.current).length), []);

  const flush = useCallback(async (key: string) => {
    clearTimeout(timers.current[key]);
    if (key.startsWith("tool:")) {
      const t = pendingTool.current[key];
      if (!t) return;
      delete pendingTool.current[key];
      recount();
      await enqueue(() => upsertToolAction(clientId, t));
      return;
    }
    const p = pendingSrc.current[key];
    if (!p) return;
    delete pendingSrc.current[key];
    recount();
    await enqueue(() => updateSourceAction(clientId, p.pid, key, p.patch));
  }, [clientId, enqueue, recount]);
  useEffect(() => { retry.current = (key) => void flush(key); }, [flush]);

  const flushAll = useCallback(async () => {
    await Promise.all([...Object.keys(pendingSrc.current), ...Object.keys(pendingTool.current)].map((k) => flush(k)));
    await drain();
  }, [flush, drain]);

  const sourcesOf = (pid: string) => [...(sources[pid] ?? [])].sort((a, b) => a.orden - b.orden);

  const addSource = useCallback((pid: string, nombre: string, formato: SourceFormat = "documento") => {
    const text = nombre.trim().slice(0, 200);
    if (!text) return;
    const source: ProcessSource = {
      id: crypto.randomUUID(), process_id: pid, orden: (sources[pid] ?? []).reduce((n, s) => Math.max(n, s.orden), -1) + 1,
      nombre: text, formato, ubicacion: null, vigencia: "no_se",
    };
    setSources((prev) => ({ ...prev, [pid]: [...(prev[pid] ?? []), source] }));
    void enqueue(() => addSourceAction(clientId, source));
  }, [sources, clientId, enqueue]);

  const patchSource = useCallback((pid: string, id: string, p: SourcePatch, delay = 0) => {
    setSources((prev) => ({ ...prev, [pid]: (prev[pid] ?? []).map((s) => (s.id === id ? { ...s, ...p } : s)) }));
    pendingSrc.current[id] = { pid, patch: { ...pendingSrc.current[id]?.patch, ...p } };
    recount();
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => retry.current(id), delay);
  }, [recount]);

  const removeSource = useCallback((pid: string, id: string) => {
    clearTimeout(timers.current[id]);
    delete pendingSrc.current[id];
    recount();
    setSources((prev) => ({ ...prev, [pid]: (prev[pid] ?? []).filter((s) => s.id !== id) }));
    void enqueue(() => removeSourceAction(clientId, pid, id));
  }, [clientId, enqueue, recount]);

  const patchTool = useCallback((nombre: string, p: Partial<Pick<ClientTool, "acceso" | "administra">>, delay = 0) => {
    const name = nombre.trim();
    if (!name) return;
    const key = `tool:${toolKey(name)}`;
    let next!: ClientTool;
    setTools((prev) => {
      const cur = prev.find((t) => toolKey(t.nombre) === toolKey(name));
      next = { nombre: cur?.nombre ?? name, acceso: (p.acceso ?? cur?.acceso ?? "no_se") as ToolAccess, administra: p.administra !== undefined ? p.administra : cur?.administra ?? null };
      return cur ? prev.map((t) => (t === cur ? next : t)) : [...prev, next];
    });
    const base = pendingTool.current[key];
    pendingTool.current[key] = { nombre: base?.nombre ?? name, acceso: (p.acceso ?? base?.acceso ?? tools.find((t) => toolKey(t.nombre) === toolKey(name))?.acceso ?? "no_se") as ToolAccess,
      administra: p.administra !== undefined ? p.administra : base?.administra ?? tools.find((t) => toolKey(t.nombre) === toolKey(name))?.administra ?? null };
    recount();
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => retry.current(key), delay);
  }, [tools, recount]);

  const api: ReadinessApi = { addSource, patchSource, removeSource, patchTool };
  return { sourcesOf, tools, api, flushAll, pendingCount };
}
