import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { one, rows } from "@/lib/db";
import { CRITERIA, DECISION, PROBLEM_TYPE, INTERVIEW_TYPE, PROCESS_STAGE } from "@/lib/labels";
import { EFFORT_RUBRIC, RUBRIC } from "@/lib/rubric";
import { suggestStage } from "@/lib/stage";
import { formatDateTime } from "@/lib/format";
import { quadrantOf, QUADRANT_LABEL, suggestDecision, IMPACT_MAX } from "@/lib/scoring";
import { conditionHints, scoreHints } from "@/lib/problems";
import { topValues } from "@/lib/process-sheet";
import type { Area, Interview, InterviewProblem, Person, Process, ProcessStep, Score } from "@/lib/types";
import { ProcessSheetStandalone } from "@/components/process-sheet-standalone";
import { Field, Panel, SelectField, TextAreaField, opts } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { deleteProcessAction, linkInterviewAction, saveScoreAction, updateProcessAction } from "../actions";

const ONE_TO_FIVE = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));

export default async function ProcesoPage({ params }: PageProps<"/clientes/[id]/procesos/[pid]">) {
  const { id, pid } = await params;
  const { supabase } = await requireOwner();
  const [p, areas, score, interviews, people, links, meas, steps, allProcs, problems] = await Promise.all([
    supabase.from("processes").select("*").eq("id", pid).eq("client_id", id).maybeSingle().then(one<Process>),
    supabase.from("areas").select("*").eq("client_id", id).order("nombre").then(rows<Area>),
    supabase.from("scores").select("*").eq("process_id", pid).maybeSingle().then(one<Score>),
    supabase.from("interviews").select("*").eq("client_id", id).order("fecha_hora", { ascending: false, nullsFirst: false }).then(rows<Interview>),
    supabase.from("people").select("*").eq("client_id", id).then(rows<Person>),
    supabase.from("interview_processes").select("interview_id, prioridad, idea, restricciones, aprueba").eq("process_id", pid)
      .then(rows<{ interview_id: string; prioridad: 1 | 2 | 3 | null; idea: string | null; restricciones: string[] | null; aprueba: string | null }>),
    supabase.from("time_measurements").select("id", { count: "exact", head: true }).eq("process_id", pid),
    supabase.from("process_steps").select("*").eq("process_id", pid).order("orden").then(rows<ProcessStep>),
    supabase.from("processes").select("sipoc").eq("client_id", id).then(rows<Pick<Process, "sipoc">>),
    supabase.from("interview_problems").select("*").eq("process_id", pid).order("created_at").then(rows<InterviewProblem>),
  ]);
  if (!p) notFound();
  const sip = p.sipoc ?? { proveedores: [], entradas: [], proceso: [], salidas: [], clientes: [] };
  const sug = (k: "proveedores" | "entradas" | "salidas" | "clientes") => topValues(allProcs.map((x) => x.sipoc?.[k] ?? []));
  const personName = Object.fromEntries(people.map((x) => [x.id, x.nombre]));
  const linked = new Set(links.map((l) => l.interview_id));
  const interviewLabel = (iid: string) => {
    const i = interviews.find((x) => x.id === iid);
    return i ? `${formatDateTime(i.fecha_hora)} · ${INTERVIEW_TYPE[i.tipo]} · ${personName[i.person_id ?? ""] ?? "Sin persona"}` : "Entrevista";
  };
  const hints = [...scoreHints(problems), ...conditionHints(links)];
  const withConditions = links.filter((l) => l.prioridad || l.idea || l.aprueba || (l.restricciones?.length ?? 0) > 0);
  const stageHint = suggestStage(p, (meas.count ?? 0) > 0, !!score);
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
            <SelectField label="Etapa del proceso" name="estado_proceso" required options={opts(PROCESS_STAGE)} defaultValue={p.estado_proceso} />
            <p className="self-end pb-2 text-xs text-muted-foreground">Sugerida según lo cargado: <b>{PROCESS_STAGE[stageHint]}</b>. «Validado» solo cuando el encargado lo confirme.</p>
            <TextAreaField className="sm:col-span-2" label="Evidencia (privada)" name="evidencia" rows={3} defaultValue={p.evidencia} />
          </div>
        </Panel>
        <SubmitButton>Guardar ficha</SubmitButton>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mapa y ficha rápida</h2>
        <ProcessSheetStandalone clientId={id} processId={pid} name={p.nombre} initialSteps={steps} measured={(meas.count ?? 0) > 0}
          initialFields={{
            disparador: p.disparador, estado_datos: p.estado_datos, excepciones: p.excepciones ?? [], problemas: p.problemas,
            sipoc: { proveedores: sip.proveedores, entradas: sip.entradas, salidas: sip.salidas, clientes: sip.clientes },
          }}
          actors={[...new Set([...people.filter((x) => x.area_id === p.area_id).map((x) => x.nombre), "Sistema", "Cliente", "Proveedor"])]}
          tools={[...new Set(["Excel", "Correo", "WhatsApp", "Papel", "Sistema propio", ...(p.herramientas ?? [])])]}
          sipocSuggestions={{ proveedores: sug("proveedores"), entradas: sug("entradas"), salidas: sug("salidas"), clientes: sug("clientes") }} />
      </section>

      {(problems.length > 0 || withConditions.length > 0) && (
        <Panel title="Lo dicho en entrevistas sobre este proceso (solo tú lo ves)">
          {hints.length > 0 && (
            <ul className="mb-3 space-y-1 rounded-lg bg-muted p-3 text-sm">
              {hints.map((h) => <li key={h}>💡 {h}</li>)}
            </ul>
          )}
          {problems.length > 0 && (
            <ul className="space-y-2 text-sm">
              {problems.map((pr) => {
                const idx = steps.findIndex((x) => x.id === pr.step_id);
                return (
                  <li key={pr.id} className="flex flex-wrap items-baseline gap-2">
                    <Badge variant={pr.tipo === "riesgo_legal" ? "destructive" : "secondary"}>{PROBLEM_TYPE[pr.tipo]}</Badge>
                    <span>{pr.texto}{idx >= 0 && <span className="text-muted-foreground"> (paso {idx + 1}: {steps[idx].texto})</span>}{pr.nota && <span className="text-muted-foreground"> — {pr.nota}</span>}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {withConditions.length > 0 && (
            <ul className="mt-3 space-y-2 border-t pt-3 text-sm">
              {withConditions.map((l) => (
                <li key={l.interview_id}>
                  <p className="text-xs text-muted-foreground">{interviewLabel(l.interview_id)}</p>
                  <p>
                    {l.prioridad && <Badge className="mr-2">Prioridad {l.prioridad}</Badge>}
                    {l.idea && <span>Idea: {l.idea}. </span>}
                    {(l.restricciones?.length ?? 0) > 0 && <span>Restricciones: {l.restricciones!.join(", ")}. </span>}
                    {l.aprueba && <span>Aprueba: {l.aprueba}.</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Panel title="Entrevistas donde surgió este proceso (solo tú lo ves)">
        <ul className="mb-3 space-y-1 text-sm">
          {interviews.filter((i) => linked.has(i.id)).map((i) => (
            <li key={i.id}>{formatDateTime(i.fecha_hora)} · {INTERVIEW_TYPE[i.tipo]} · {personName[i.person_id ?? ""] ?? "Sin persona"}</li>
          ))}
          {linked.size === 0 && <li className="text-muted-foreground">Aún sin vincular.</li>}
        </ul>
        {interviews.some((i) => !linked.has(i.id)) && (
          <form action={linkInterviewAction.bind(null, id, pid)} className="flex items-end gap-2">
            <SelectField label="Vincular entrevista" name="interview_id" required className="flex-1"
              options={interviews.filter((i) => !linked.has(i.id)).map((i) => ({ value: i.id, label: `${formatDateTime(i.fecha_hora)} · ${INTERVIEW_TYPE[i.tipo]} · ${personName[i.person_id ?? ""] ?? "Sin persona"}` }))} />
            <SubmitButton size="sm" variant="secondary">Vincular</SubmitButton>
          </form>
        )}
      </Panel>

      <Panel title="Puntuación de automatizabilidad">
        <details className="mb-4 rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Ver rúbrica de puntuación (5 = muy favorable a automatizar)</summary>
          <div className="mt-3 space-y-3">
            {[...RUBRIC, { key: "esfuerzo", pregunta: "5 = más difícil de implementar.", ...EFFORT_RUBRIC }].map((r) => (
              <div key={r.key}>
                <p className="font-medium">{r.label} <span className="font-normal text-muted-foreground">— {r.pregunta}</span></p>
                <ul className="ml-4 list-disc text-xs text-muted-foreground">
                  <li><b>1:</b> {r.uno}</li><li><b>3:</b> {r.tres}</li><li><b>5:</b> {r.cinco}</li>
                </ul>
              </div>
            ))}
          </div>
        </details>
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
