import { requireOwner } from "@/lib/auth";
import { rows } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PHASE } from "@/lib/labels";
import { assessRisk, CONTROLS, controlsDone, RISK_QUESTIONS, type RiskAnswers, type RiskLevel } from "@/lib/risk";
import type { RoadmapItem } from "@/lib/types";
import { Empty, Field, Panel, TextAreaField } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { saveRiskAction } from "./actions";

type Review = RiskAnswers & {
  roadmap_item_id: string; responsable_cliente: string | null; controles: Record<string, boolean>;
  nivel: RiskLevel; notas: string | null; revisado_en: string;
};
const TONE: Record<RiskLevel, "default" | "secondary" | "destructive"> = { bajo: "secondary", medio: "default", alto: "destructive" };

export default async function RiesgosPage({ params }: PageProps<"/clientes/[id]/riesgos">) {
  const { id } = await params;
  const { supabase } = await requireOwner();
  const items = rows<RoadmapItem>(await supabase.from("roadmap_items").select("*").eq("client_id", id).order("titulo"));
  const reviews = rows<Review>(items.length
    ? await supabase.from("risk_reviews").select("*").in("roadmap_item_id", items.map((i) => i.id))
    : { data: [], error: null });
  const procIds = [...new Set(items.map((i) => i.process_id).filter((x): x is string => !!x))];
  const iaProcs = new Set(rows<{ process_id: string; decision: string | null }>(procIds.length
    ? await supabase.from("scores").select("process_id,decision").in("process_id", procIds)
    : { data: [], error: null }).filter((s) => s.decision === "integrar_ia").map((s) => s.process_id));
  const byItem = new Map(reviews.map((r) => [r.roadmap_item_id, r]));
  const pending = items.filter((i) => !byItem.has(i.id)).length;

  if (items.length === 0) return <Empty>Primero crea ítems en la hoja de ruta; aquí revisas el riesgo de cada uno.</Empty>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tamizaje de riesgo y controles por ítem, alineado con NIST AI RMF y la guía ISO/IEC 23894. Apoya tu decisión; no reemplaza una evaluación legal o técnica.
        El cliente ve solo el nivel (bajo, medio o alto), nunca tus respuestas ni notas. {pending > 0 && <b>{pending} ítem(s) sin revisar.</b>}
      </p>
      {items.map((it) => {
        const r = byItem.get(it.id);
        const result = r ? assessRisk(r, !!it.process_id && iaProcs.has(it.process_id)) : null;
        return (
          <details key={it.id} className="rounded-xl border bg-card" open={!r}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-3 text-sm">
              <span className="font-medium">{it.titulo}</span>
              <Badge variant="outline">{PHASE[it.fase]}</Badge>
              {r ? <Badge variant={TONE[r.nivel]}>Riesgo {r.nivel}</Badge> : <Badge variant="outline">Sin revisar</Badge>}
              {r && <span className="text-xs text-muted-foreground">Controles {controlsDone(r.controles)}/{CONTROLS.length} · revisado {formatDateTime(r.revisado_en)}</span>}
            </summary>
            <form action={saveRiskAction.bind(null, id, it.id)} className="space-y-5 border-t p-4">
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel title="Revisión de riesgo (marca «Sí»)">
                  <ul className="space-y-3 text-sm">
                    {RISK_QUESTIONS.map((q) => (
                      <li key={q.key}>
                        <label className="flex items-start gap-2">
                          <input type="checkbox" name={q.key} defaultChecked={r?.[q.key] ?? false} className="mt-1" />
                          <span>{q.pregunta}<span className="block text-xs text-muted-foreground">{q.ayuda}</span></span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </Panel>
                <Panel title="Ficha de controles de la automatización (marca los que existirán)">
                  <ul className="space-y-3 text-sm">
                    {CONTROLS.map((c) => (
                      <li key={c.key}>
                        <label className="flex items-start gap-2">
                          <input type="checkbox" name={`ctl_${c.key}`} defaultChecked={r?.controles?.[c.key] ?? false} className="mt-1" />
                          <span>{c.label}<span className="block text-xs text-muted-foreground">{c.ayuda}</span></span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Responsable en el cliente (privado)" name="responsable_cliente" defaultValue={r?.responsable_cliente} />
                <TextAreaField label="Notas (privadas)" name="notas" rows={2} defaultValue={r?.notas} />
              </div>
              {result && result.acciones.length > 0 && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="mb-1 font-medium">Acciones sugeridas para bajar el riesgo</p>
                  <ul className="list-disc space-y-0.5 pl-5">{result.acciones.map((a) => <li key={a}>{a}</li>)}</ul>
                </div>
              )}
              <SubmitButton>Guardar revisión</SubmitButton>
            </form>
          </details>
        );
      })}
    </div>
  );
}
