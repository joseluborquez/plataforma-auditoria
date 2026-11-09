"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const EVENT = "stopwatch-change";
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
};
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string | null) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* sin almacenamiento: el cronómetro igual funciona */ }
  window.dispatchEvent(new Event(EVENT));
};

type Running = { startedAt: number; base: number };
function parse(raw: string | null): Running | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Running>;
    return typeof v.startedAt === "number" && typeof v.base === "number" ? { startedAt: v.startedAt, base: v.base } : null;
  } catch { return null; }
}

/**
 * Cronómetro general de la reunión. Calcula con la hora real (no cuenta ticks), así que no se atrasa con la pestaña en segundo plano,
 * y recuerda que estaba corriendo si se recarga la página. `save` guarda el total acumulado.
 */
export function useStopwatch(storageKey: string | null, initialSeconds: number, save: (totalSeconds: number) => Promise<unknown>) {
  const key = storageKey ? `timer:${storageKey}` : null;
  const raw = useSyncExternalStore(subscribe, () => (key ? read(key) : null), () => null);
  const running = parse(raw);
  const [base, setBase] = useState(initialSeconds);
  const [now, setNow] = useState(() => Date.now());

  const seconds = running ? running.base + Math.max(0, Math.floor((now - running.startedAt) / 1000)) : base;
  const isRunning = !!running;

  useEffect(() => {
    if (!isRunning) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [isRunning]);

  const startedAt = running?.startedAt;
  const runBase = running?.base;
  const saveRunning = useCallback(() => {
    if (startedAt === undefined || runBase === undefined) return;
    void save(runBase + Math.max(0, Math.floor((Date.now() - startedAt) / 1000))).catch(() => {});
  }, [startedAt, runBase, save]);

  // Guarda cada 30 s mientras corre y al salir de la pestaña.
  useEffect(() => {
    if (!isRunning) return;
    const periodic = setInterval(saveRunning, 30000);
    const onHide = () => { if (document.visibilityState === "hidden") saveRunning(); };
    document.addEventListener("visibilitychange", onHide);
    return () => { clearInterval(periodic); document.removeEventListener("visibilitychange", onHide); };
  }, [isRunning, saveRunning]);

  const start = useCallback(() => {
    if (!key) return;
    setNow(Date.now());
    write(key, JSON.stringify({ startedAt: Date.now(), base: seconds } satisfies Running));
  }, [key, seconds]);

  /** Detiene el cronómetro, guarda el total y lo devuelve. */
  const stop = useCallback(async () => {
    if (!key) return seconds;
    const total = running ? running.base + Math.max(0, Math.floor((Date.now() - running.startedAt) / 1000)) : seconds;
    write(key, null);
    setBase(total);
    await save(total).catch(() => {});
    return total;
  }, [key, running, seconds, save]);

  return { seconds, running: isRunning, start, stop };
}
