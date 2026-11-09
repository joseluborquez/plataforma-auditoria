"use client";

import { useCallback, useRef } from "react";

export type Track = <T>(p: Promise<T>) => Promise<T>;

/** Cola de escrituras en fila con reintentos. `track` informa el estado de guardado a quien lo muestre. */
export function useSaveQueue(track: Track) {
  const queue = useRef<Promise<unknown>>(Promise.resolve());
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
  const drain = useCallback(() => queue.current.catch(() => {}), []);
  return { enqueue, drain };
}
