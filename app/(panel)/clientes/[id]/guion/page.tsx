import Link from "next/link";
import { EFFORT_RUBRIC, RUBRIC } from "@/lib/rubric";
import { GUIDES, POST_PROTOCOL, PRE_CHECKLIST, TIPS } from "@/lib/guide";
import { requireOwner } from "@/lib/auth";
import { rows } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import type { Interview, Person } from "@/lib/types";
import { Panel, TextAreaField } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { saveAnswersAction } from "./actions";
import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function GuionPage({ params, searchParams }: PageProps<"/clientes/[id]/guion">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireOwner();
  const tipo = sp.tipo === "trabajador" ? "trabajador" : "encargado";
  const guide = GUIDES[tipo];
  const total = guide.secciones.reduce((n, s) => n + s.minutos, 0);

  const [interviews, people] = await Promise.all([
    supabase.from("interviews").select("*").eq("client_id", id).eq("tipo", tipo)
      .order("fecha_hora", { ascending: false, nullsFirst: false }).then(rows<Interview>),
    supabase.from("people").select("*").eq("client_id", id).then(rows<Person>),
  ]);
  const names = Object.fromEntries(people.map((p) => [p.id, p.nombre]));
  const label = (i: Interview) => `${names[i.person_id ?? ""] ?? "Sin persona"} · ${formatDateTime(i.fecha_hora)}`;
  const selected = interviews.find((i) => i.id === sp.entrevista) ?? interviews[0] ?? null;
  const answers = new Map(
    selected
      ? rows<{ pregunta_key: string; respuesta: string }>(
          await supabase.from("interview_answers").select("pregunta_key, respuesta").eq("interview_id", selected.id),
        ).map((a) => [a.pregunta_key, a.respuesta])
      : [],
  );

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 text-sm">
          {(["encargado", "trabajador"] as const).map((t) => (
            <Link key={t} href={`/clientes/${id}/guion?tipo=${t}`}
              className={cn("rounded-md px-3 py-1", tipo === t ? "bg-accent" : "text-muted-foreground hover:text-foreground")}>
              {t === "encargado" ? "Encargado de área" : "Trabajador"}
            </Link>
          ))}
        </div>
        <PrintButton />
      </div>

      <Panel className="no-print" title="Respuestas de esta entrevista">
        {interviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay entrevistas de este tipo. Crea una en <Link href={`/clientes/${id}/entrevistas`} className="text-primary hover:underline">Entrevistas</Link> para registrar las respuestas aquí.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 text-sm">
            {interviews.map((i) => (
              <Link key={i.id} href={`/clientes/${id}/guion?tipo=${tipo}&entrevista=${i.id}`}
                className={cn("rounded-md border px-3 py-1", selected?.id === i.id ? "border-primary bg-accent" : "text-muted-foreground hover:text-foreground")}>
                {label(i)}
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <div>
        <h2 className="text-xl font-semibold">{guide.titulo}</h2>
        <p className="text-sm text-muted-foreground">{guide.resumen} Suma de tiempos: {total} min.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Antes de la reunión">
          <ul className="space-y-1.5 text-sm">{PRE_CHECKLIST.map((t) => <li key={t} className="flex gap-2"><span aria-hidden>☐</span>{t}</li>)}</ul>
        </Panel>
        <Panel title="Después de la reunión (dentro de 24 horas)">
          <ul className="space-y-1.5 text-sm">{POST_PROTOCOL.map((t) => <li key={t} className="flex gap-2"><span aria-hidden>☐</span>{t}</li>)}</ul>
        </Panel>
      </div>

      <form action={selected ? saveAnswersAction.bind(null, id, selected.id) : undefined} className="space-y-4">
        {guide.secciones.map((s, si) => (
          <Panel key={s.titulo} className="break-inside-avoid">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{s.titulo}</h3>
              <Badge variant="outline">{s.minutos} min</Badge>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{s.objetivo}</p>
            <ol className="space-y-3 text-sm">
              {s.preguntas.map((q, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{i + 1}.</span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p>{q.texto}</p>
                    {q.sondeo && <p className="text-xs text-muted-foreground">Sondeo: {q.sondeo}</p>}
                    {q.campo && <Badge variant="secondary">→ {q.campo}</Badge>}
                    {selected && (
                      <TextAreaField key={`${selected.id}-s${si}q${i}`} label="Respuesta" name={`r_s${si}q${i}`} rows={3}
                        defaultValue={answers.get(`s${si}q${i}`) ?? ""} placeholder="Escribe aquí lo que respondió la persona" />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        ))}
        {selected && (
          <div className="no-print sticky bottom-3 flex justify-end">
            <div className="rounded-xl border bg-card p-2 shadow-sm"><SubmitButton>Guardar respuestas</SubmitButton></div>
          </div>
        )}
      </form>

      <Panel title="Consejos de entrevista">
        <ul className="list-disc space-y-1 pl-5 text-sm">{TIPS.map((t) => <li key={t}>{t}</li>)}</ul>
      </Panel>

      <Panel title="Rúbrica de puntuación (5 = muy favorable a automatizar)" className="print-break">
        <div className="space-y-4 text-sm">
          {[...RUBRIC, { key: "esfuerzo", pregunta: "Para el esfuerzo, 5 = más difícil de implementar.", ...EFFORT_RUBRIC }].map((r) => (
            <div key={r.key} className="break-inside-avoid">
              <p className="font-medium">{r.label} <span className="font-normal text-muted-foreground">— {r.pregunta}</span></p>
              <dl className="mt-1 grid gap-1 sm:grid-cols-3">
                {([["1", r.uno], ["3", r.tres], ["5", r.cinco]] as const).map(([n, t]) => (
                  <div key={n} className="rounded border p-2"><dt className="font-mono text-xs text-muted-foreground">{n}</dt><dd>{t}</dd></div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
