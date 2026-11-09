"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

type Theme = "dark" | "light";
const EVENT = "theme-change";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
const read = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

/** Alterna entre modo oscuro (por defecto) y claro; recuerda la elección en este navegador. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as Theme);
  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("theme", next); } catch {}
    window.dispatchEvent(new Event(EVENT));
  }
  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={toggle}
      aria-label={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}>
      {theme === "light" ? "☾ Modo oscuro" : "☀ Modo claro"}
    </Button>
  );
}
