"use client";

import { useCallback, useState } from "react";
import type { ProcessFields, ProcessStep } from "@/lib/types";
import { ProcessSheet, type SipocSuggestions } from "@/components/process-sheet";
import { useProcessFields } from "@/components/use-process-fields";
import { useProcessSteps } from "@/components/use-process-steps";

/** La ficha rápida con su propio guardado automático, para usarla fuera del guion (página del proceso). */
export function ProcessSheetStandalone({ clientId, processId, name, initialSteps, initialFields, actors, tools, sipocSuggestions, measured: measuredInit }: {
  clientId: string; processId: string; name?: string; initialSteps: ProcessStep[]; initialFields: ProcessFields;
  actors: string[]; tools: string[]; sipocSuggestions: SipocSuggestions; measured: boolean;
}) {
  const [measured, setMeasured] = useState(measuredInit);
  const [inFlight, setInFlight] = useState(0);
  const [failed, setFailed] = useState(false);
  const track = useCallback(async <T,>(p: Promise<T>) => {
    setInFlight((n) => n + 1);
    try { const r = await p; setFailed(false); return r; } catch (e) { setFailed(true); throw e; } finally { setInFlight((n) => n - 1); }
  }, []);
  const steps = useProcessSteps(clientId, { [processId]: initialSteps }, track);
  const fields = useProcessFields(clientId, { [processId]: initialFields }, track);
  const busy = inFlight > 0 || steps.pendingCount + fields.pendingCount > 0;
  return (
    <div className="space-y-3">
      <p aria-live="polite" className={failed ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {failed ? "Sin conexión, reintentando…" : busy ? "Guardando…" : "Guardado ✓ (se guarda solo)"}
      </p>
      <ProcessSheet clientId={clientId} processId={processId} name={name} steps={steps.stepsOf(processId)} fields={fields.fieldsOf(processId)}
        stepsApi={steps} onFields={(p, d) => fields.patch(processId, p, d)} actors={actors} tools={tools}
        sipocSuggestions={sipocSuggestions} defaultVeces={null} defaultMetodo="declarado" measured={measured} onMeasured={() => setMeasured(true)} />
    </div>
  );
}
