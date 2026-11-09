"use client";

import { useState } from "react";
import { addUnique } from "@/lib/process-sheet";
import { cn } from "@/lib/utils";

/** Lista de etiquetas: escribe y presiona Enter o coma; las sugerencias se agregan con un clic. */
export function ChipList({ label, hint, values, suggestions = [], onChange, placeholder = "Escribe y presiona Enter", maxLen = 100 }: {
  label: string; hint?: string; values: string[]; suggestions?: string[]; onChange: (v: string[]) => void; placeholder?: string; maxLen?: number;
}) {
  const [draft, setDraft] = useState("");
  const add = (text: string) => {
    const parts = text.split(/[,\n]/).map((x) => x.trim().slice(0, maxLen)).filter(Boolean);
    if (parts.length) onChange(addUnique(values, parts));
    setDraft("");
  };
  const open = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8);
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}{hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}</p>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input p-1.5 focus-within:border-ring">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs">
            {v}
            <button type="button" aria-label={`Quitar ${v}`} className="text-muted-foreground hover:text-destructive" onClick={() => onChange(values.filter((x) => x !== v))}>✕</button>
          </span>
        ))}
        <input value={draft} maxLength={maxLen} aria-label={label} placeholder={values.length ? "" : placeholder}
          onChange={(e) => setDraft(e.target.value)} onBlur={() => draft.trim() && add(draft)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); } else if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1)); }}
          className="h-7 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none" />
      </div>
      {open.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {open.map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className={cn("rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground")}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
