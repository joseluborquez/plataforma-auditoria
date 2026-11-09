"use client";

import { useState } from "react";
import { EVIDENCE_LABEL, type Evidence, type Suggestion } from "@/lib/score-suggest";
import type { Score } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const selectCls = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const EVIDENCE_STYLE: Record<Evidence, string> = {
  datos: "border-primary/50 text-foreground", parcial: "text-muted-foreground", sin_datos: "border-dashed text-muted-foreground",
};

/** Formulario de puntuación con sugerencias y su respaldo. Las sugerencias solo rellenan el formulario: tú decides y guardas. */
export function ScoreForm({ action, score, suggestions, criteria, decisionOptions }: {
  action: (fd: FormData) => Promise<void>; score: Score | null; suggestions: Suggestion[];
  criteria: readonly (readonly [string, string])[]; decisionOptions: { value: string; label: string }[];
}) {
  const keys = [...criteria.map(([k]) => k), "esfuerzo"];
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(keys.map((k) => [k, String((score as unknown as Record<string, number> | null)?.[k] ?? 3)])));
  const [legal, setLegal] = useState(score?.riesgo_legal ?? false);
  const [decision, setDecision] = useState<string>(score?.decision ?? "");
  const byKey = new Map(suggestions.map((s) => [s.key, s]));
  const applicable = suggestions.filter((s) => typeof s.value === "number" && !s.hintOnly && s.evidence !== "sin_datos");
  const legalSug = byKey.get("riesgo_legal");

  function applyAll() {
    setVals((v) => ({ ...v, ...Object.fromEntries(applicable.map((s) => [s.key, String(s.value)])) }));
    if (legalSug?.value === true) setLegal(true);
  }

  const hint = (k: string) => {
    const s = byKey.get(k as Suggestion["key"]);
    if (!s) return null;
    return (
      <div className="mt-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn("text-[10px]", EVIDENCE_STYLE[s.evidence])}>{EVIDENCE_LABEL[s.evidence]}</Badge>
          {typeof s.value === "number" && (
            <>
              <span className="text-xs">{s.hintOnly ? "Pista" : "Sugerido"}: <b className="font-mono">{s.value}</b></span>
              {String(s.value) !== vals[k] && (
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => setVals((v) => ({ ...v, [k]: String(s.value) }))}>Aplicar</button>
              )}
            </>
          )}
        </div>
        {s.why.map((w) => <p key={w} className="text-[11px] leading-snug text-muted-foreground">{w}</p>)}
      </div>
    );
  };

  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted p-3 text-sm">
        <Button type="button" variant="secondary" size="sm" onClick={applyAll} disabled={applicable.length === 0 && legalSug?.value !== true}>
          Usar sugeridos ({applicable.length})
        </Button>
        <span className="text-xs text-muted-foreground">
          Las sugerencias salen de lo capturado en entrevistas y solo rellenan el formulario; tú ajustas y guardas.
          Quién lo asume y esfuerzo son solo una pista.
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {criteria.map(([k, label]) => (
          <div key={k}>
            <label htmlFor={k} className="text-sm font-medium">{label} (1-5)</label>
            <select id={k} name={k} required value={vals[k]} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} className={cn(selectCls, "mt-1.5")}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n} className="bg-card">{n}</option>)}
            </select>
            {hint(k)}
          </div>
        ))}
        <div>
          <label htmlFor="esfuerzo" className="text-sm font-medium">Esfuerzo de implementar (1-5)</label>
          <select id="esfuerzo" name="esfuerzo" required value={vals.esfuerzo} onChange={(e) => setVals((v) => ({ ...v, esfuerzo: e.target.value }))} className={cn(selectCls, "mt-1.5")}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n} className="bg-card">{n}</option>)}
          </select>
          {hint("esfuerzo")}
        </div>
        <div>
          <label htmlFor="decision" className="text-sm font-medium">Decisión</label>
          <select id="decision" name="decision" value={decision} onChange={(e) => setDecision(e.target.value)} className={cn(selectCls, "mt-1.5")}>
            <option value="" className="bg-card">Sin decidir</option>
            {decisionOptions.map((o) => <option key={o.value} value={o.value} className="bg-card">{o.label}</option>)}
          </select>
        </div>
        <div className="self-end pb-1">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="riesgo_legal" checked={legal} onChange={(e) => setLegal(e.target.checked)} /> Riesgo legal</label>
          {legalSug && (
            <div className="mt-1 space-y-1">
              <Badge variant="outline" className={cn("text-[10px]", EVIDENCE_STYLE[legalSug.evidence])}>{EVIDENCE_LABEL[legalSug.evidence]}</Badge>
              {legalSug.why.map((w) => <p key={w} className="text-[11px] leading-snug text-muted-foreground">{w}</p>)}
            </div>
          )}
        </div>
      </div>
      <SubmitButton>Guardar puntuación</SubmitButton>
    </form>
  );
}
