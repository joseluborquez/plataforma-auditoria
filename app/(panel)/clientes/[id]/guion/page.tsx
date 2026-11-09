import Link from "next/link";
import { EFFORT_RUBRIC, RUBRIC } from "@/lib/rubric";
import { GUIDES, POST_PROTOCOL, PRE_CHECKLIST, TIPS } from "@/lib/guide";
import { requireOwner } from "@/lib/auth";
import { rows } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import type { Area, Interview, Person, Process } from "@/lib/types";
import { Panel } from "@/components/form";
import { InterviewLive, type LiveAnswer } from "@/components/interview-live";
import { cn } from "@/lib/utils";

export default async function GuionPage({ params, searchParams }: PageProps<"/clientes/[id]/guion">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireOwner();
  const tipo = sp.tipo === "trabajador" ? "trabajador" : "encargado";
  const guide = GUIDES[tipo];

  const [interviews, people, areas, processes] = await Promise.all([
    supabase.from("interviews").select("*").eq("client_id", id).eq("tipo", tipo)
      .order("fecha_hora", { ascending: false, nullsFirst: false }).then(rows<Interview>),
    supabase.from("people").select("*").eq("client_id", id).then(rows<Person>),
    supabase.from("areas").select("*").eq("client_id", id).order("nombre").then(rows<Area>),
    supabase.from("processes").select("*").eq("client_id", id).order("nombre").then(rows<Process>),
  ]);
  const names = Object.fromEntries(people.map((p) => [p.id, p.nombre]));
  const label = (i: Interview) => `${names[i.person_id ?? ""] ?? "Sin persona"} · ${formatDateTime(i.fecha_hora)}`;
  const selected = interviews.find((i) => i.id === sp.entrevista) ?? interviews[0] ?? null;

  let initialAnswers: Record<string, LiveAnswer> = {};
  let initialChecks: string[] = [];
  let initialTiming: Record<number, number> = {};
  let linkedIds: string[] = [];
  if (selected) {
    const [answers, checks, timing, links] = await Promise.all([
      supabase.from("interview_answers").select("pregunta_key, respuesta, no_aplica").eq("interview_id", selected.id)
        .then(rows<{ pregunta_key: string; respuesta: string; no_aplica: boolean }>),
      supabase.from("interview_checks").select("item_key").eq("interview_id", selected.id).then(rows<{ item_key: string }>),
      supabase.from("interview_timing").select("seccion, segundos").eq("interview_id", selected.id).then(rows<{ seccion: number; segundos: number }>),
      supabase.from("interview_processes").select("process_id").eq("interview_id", selected.id).then(rows<{ process_id: string }>),
    ]);
    initialAnswers = Object.fromEntries(answers.map((a) => [a.pregunta_key, { respuesta: a.respuesta, no_aplica: a.no_aplica }]));
    initialChecks = checks.map((c) => c.item_key);
    initialTiming = Object.fromEntries(timing.map((t) => [t.seccion, t.segundos]));
    linkedIds = links.map((l) => l.process_id);
  }
  const opt = (p: Process) => ({ id: p.id, nombre: p.nombre });

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 text-sm">
          {(["encargado", "trabajador"] as const).map((t) => (
            <Link key={t} href={`/clientes/${id}/guion?tipo=${t}`}
              className={cn("rounded-md px-3 py-1", tipo === t ? "bg-accent" : "text-muted-foreground hover:text-foreground")}>
              {t === "encargado" ? "Encargado de área" : "Trabajador"}
            </Link>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{guide.titulo} · {guide.resumen}</p>
        {interviews.length === 0 && (
          <p className="w-full text-sm text-muted-foreground">
            No hay entrevistas de este tipo. Crea una en <Link href={`/clientes/${id}/entrevistas`} className="text-primary hover:underline">Entrevistas</Link> para registrar respuestas.
          </p>
        )}
      </div>

      <InterviewLive
        key={`${tipo}-${selected?.id ?? "none"}`}
        clientId={id} tipo={tipo} guide={guide}
        pre={PRE_CHECKLIST} post={POST_PROTOCOL} tips={TIPS}
        interviews={interviews.map((i) => ({ id: i.id, label: label(i) }))}
        interview={selected ? { id: selected.id, estado: selected.estado, area_id: selected.area_id } : null}
        initialAnswers={initialAnswers} initialChecks={initialChecks} initialTiming={initialTiming}
        linked={processes.filter((p) => linkedIds.includes(p.id)).map(opt)}
        available={processes.filter((p) => !linkedIds.includes(p.id)).map(opt)}
        areas={areas.map((a) => ({ id: a.id, nombre: a.nombre }))}
      >
        <Panel title="Rúbrica de puntuación (5 = muy favorable a automatizar)">
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
      </InterviewLive>
    </div>
  );
}
