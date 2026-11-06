import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { one, rows } from "@/lib/db";
import { CRITERIA, DATA_STATE, DECISION } from "@/lib/labels";
import { impactOf, quadrantOf, QUADRANT_LABEL, suggestDecision, IMPACT_MAX } from "@/lib/scoring";
import type { Area, Process, Score } from "@/lib/types";
import { Field, Panel, SelectField, TextAreaField, opts } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { deleteProcessAction, saveScoreAction, updateProcessAction } from "../actions";

const SIPOC = [
  ["proveedores", "S · Proveedores"], ["entradas", "I · Entradas"], ["proceso", "P · Proceso"],
  ["salidas", "O · Salidas"], ["clientes", "C · Clientes"],
] as const;
const ONE_TO_FIVE = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));

export default async function ProcesoPage({ params }: PageProps<"/clientes/[id]/procesos/[pid]">) {
  const { id, pid } = await params;
  const { supabase } = await requireOwner();
  const [p, areas, score] = await Promise.all([
    supabase.from("processes").select("*").eq("id", pid).eq("client_id", id).maybeSingle().then(one<Process>),
    supabase.from("areas").select("*").eq("client_id", id).order("nombre").then(rows<Area>),
    supabase.from("scores").select("*").eq("process_id", pid).maybeSingle().then(one<Score>),
  ]);
  if (!p) notFound();
  const sip = p.sipoc ?? { proveedores: [], entradas: [], proceso: [], salidas: [], clientes: [] };
  const suggestion = score ? suggestDecision(score.impacto, score.esfuerzo, score.riesgo_legal) : null;

  return (
    <div className="space-y-6">
      <Link href={`/clientes/${id}/procesos`} className="text-xs text-muted-foreground hover:text-foreground">← Procesos</Link>
      <form action={updateProcessAction.bind(null, id, pid)} className="space-y-6">
        <Panel title="Ficha del proceso">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" name="nombre" defaultValue={p.nombre} required />
            <SelectField label="Área" name="area_id" required defaultValue={p.area_id} options={areas.map((a) => ({ value: a.id, label: a.nombre }))} />
            <Field label="Responsable (privado)" name="responsable" defaultValue={p.responsable} />
            <Field label="Disparador" name="disparador" defaultValue={p.disparador} />
            <TextAreaField label="Pasos (uno por línea)" name="pasos" rows={6} defaultValue={(p.pasos ?? []).join("\n")} />
            <TextAreaField label="Problemas detectados" name="problemas" rows={6} defaultValue={p.problemas} />
            <Field label="Herramientas (separadas por coma)" name="herramientas" defaultValue={(p.herramientas ?? []).join(", ")} />
            <SelectField label="Estado de los datos" name="estado_datos" emptyLabel="Sin definir" options={opts(DATA_STATE)} defaultValue={p.estado_datos} />
            <TextAreaField className="sm:col-span-2" label="Evidencia (privada)" name="evidencia" rows={3} defaultValue={p.evidencia} />
          </div>
        </Panel>
        <Panel title="SIPOC (un elemento por línea)">
          <div className="grid gap-3 sm:grid-cols-5">
            {SIPOC.map(([k, label]) => (
              <TextAreaField key={k} label={label} name={`sipoc_${k}`} rows={6} defaultValue={sip[k].join("\n")} />
            ))}
          </div>
        </Panel>
        <SubmitButton>Guardar ficha</SubmitButton>
      </form>

      <Panel title="Puntuación de automatizabilidad">
        {score && (
          <p className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono text-lg">Impacto {score.impacto}/{IMPACT_MAX}</span>
            <Badge variant="secondary">{QUADRANT_LABEL[quadrantOf(score.impacto, score.esfuerzo)]}</Badge>
            {suggestion && <span className="text-muted-foreground">Sugerencia: {DECISION[suggestion]}</span>}
          </p>
        )}
        <form action={saveScoreAction.bind(null, id, pid)} className="grid gap-3 sm:grid-cols-3">
          {CRITERIA.map(([k, label]) => (
            <SelectField key={k} label={`${label} (1-5)`} name={k} required options={ONE_TO_FIVE}
              defaultValue={String(score?.[k] ?? 3)} />
          ))}
          <SelectField label="Esfuerzo de implementar (1-5)" name="esfuerzo" required options={ONE_TO_FIVE} defaultValue={String(score?.esfuerzo ?? 3)} />
          <SelectField label="Decisión" name="decision" emptyLabel="Sin decidir" options={opts(DECISION)} defaultValue={score?.decision} />
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="riesgo_legal" defaultChecked={score?.riesgo_legal} /> Riesgo legal</label>
          <div className="sm:col-span-3"><SubmitButton>Guardar puntuación</SubmitButton></div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">Impacto = suma de los seis criterios (6 a 30). 1 = poco favorable a automatizar, 5 = muy favorable.</p>
      </Panel>

      <ConfirmDelete action={deleteProcessAction.bind(null, id, pid)} label="Eliminar proceso" what={p.nombre} />
    </div>
  );
}
