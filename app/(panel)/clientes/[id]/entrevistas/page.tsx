import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { rows } from "@/lib/db";
import { coverageByArea } from "@/lib/coverage";
import { formatDateTime, isoToSantiagoLocal, todayISO } from "@/lib/format";
import { INTERVIEW_STATUS, INTERVIEW_TYPE } from "@/lib/labels";
import type { Area, Interview, Person, Process } from "@/lib/types";
import { Empty, Field, Panel, SelectField, TextAreaField, opts } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { InterviewCalendar } from "@/components/interview-calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createInterviewAction, deleteInterviewAction, linkProcessAction, unlinkProcessAction, updateInterviewAction } from "./actions";

function StatusBadge({ s }: { s: Interview["estado"] | null }) {
  if (!s) return <Badge variant="destructive">Falta</Badge>;
  return <Badge variant={s === "realizada" ? "default" : "secondary"}>{INTERVIEW_STATUS[s]}</Badge>;
}

export default async function EntrevistasPage({ params, searchParams }: PageProps<"/clientes/[id]/entrevistas">) {
  const { id } = await params;
  const sp = await searchParams;
  const vista = sp.vista === "calendario" ? "calendario" : "lista";
  const month = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : todayISO().slice(0, 7);
  const { supabase } = await requireOwner();

  const [areas, people, interviews, processes] = await Promise.all([
    supabase.from("areas").select("*").eq("client_id", id).order("nombre").then(rows<Area>),
    supabase.from("people").select("*").eq("client_id", id).order("nombre").then(rows<Person>),
    supabase.from("interviews").select("*").eq("client_id", id).order("fecha_hora", { ascending: false, nullsFirst: false }).then(rows<Interview>),
    supabase.from("processes").select("*").eq("client_id", id).order("nombre").then(rows<Process>),
  ]);
  const notes = rows<{ interview_id: string; notas_privadas: string }>(
    interviews.length
      ? await supabase.from("interview_notes").select("*").in("interview_id", interviews.map((i) => i.id))
      : { data: [], error: null },
  );
  const links = rows<{ interview_id: string; process_id: string }>(
    interviews.length
      ? await supabase.from("interview_processes").select("*").in("interview_id", interviews.map((i) => i.id))
      : { data: [], error: null },
  );
  const procName = Object.fromEntries(processes.map((p) => [p.id, p.nombre]));
  const noteOf = new Map(notes.map((n) => [n.interview_id, n.notas_privadas]));
  const names = Object.fromEntries(people.map((p) => [p.id, p.nombre]));
  const areaName = Object.fromEntries(areas.map((a) => [a.id, a.nombre]));
  const coverage = coverageByArea(areas, interviews);
  const pending = coverage.reduce((n, c) => n + (c.encargado === "realizada" ? 0 : 1) + (c.trabajador === "realizada" ? 0 : 1), 0);
  const base = `/clientes/${id}/entrevistas`;
  const personOpts = people.map((p) => ({ value: p.id, label: `${p.nombre}${p.area_id ? ` (${areaName[p.area_id] ?? ""})` : ""}` }));
  const areaOpts = areas.map((a) => ({ value: a.id, label: a.nombre }));

  return (
    <div className="space-y-6">
      <Panel title={`Cobertura por área · ${pending} entrevista(s) por realizar`}>
        {areas.length === 0 ? <Empty>Primero crea las áreas en la pestaña Resumen.</Empty> : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {coverage.map((c) => (
              <div key={c.area.id} className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-medium">{c.area.nombre}</p>
                <div className="flex items-center justify-between text-xs"><span>Encargado</span><StatusBadge s={c.encargado} /></div>
                <div className="mt-1 flex items-center justify-between text-xs"><span>Trabajador</span><StatusBadge s={c.trabajador} /></div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Agendar entrevista">
        <form action={createInterviewAction.bind(null, id)} className="grid gap-3 sm:grid-cols-3">
          <SelectField label="Área" name="area_id" emptyLabel="Sin área" options={areaOpts} />
          <SelectField label="Persona" name="person_id" emptyLabel="Sin asignar" options={personOpts} />
          <SelectField label="Tipo" name="tipo" required options={opts(INTERVIEW_TYPE)} />
          <Field label="Fecha y hora (Santiago)" name="fecha_hora" type="datetime-local" />
          <Field label="Duración (min)" name="duracion_min" type="number" min={1} placeholder="120" />
          <SelectField label="Estado" name="estado" required defaultValue="agendada" options={opts(INTERVIEW_STATUS)} />
          <div className="sm:col-span-3"><SubmitButton>Crear entrevista</SubmitButton></div>
        </form>
      </Panel>

      <div className="flex gap-2 text-sm">
        {(["lista", "calendario"] as const).map((v) => (
          <Link key={v} href={`${base}?vista=${v}`}
            className={cn("rounded-md px-3 py-1", vista === v ? "bg-accent" : "text-muted-foreground hover:text-foreground")}>
            {v === "lista" ? "Lista" : "Calendario"}
          </Link>
        ))}
      </div>

      {vista === "calendario" ? (
        <Panel><InterviewCalendar month={month} interviews={interviews} names={names} basePath={base} /></Panel>
      ) : interviews.length === 0 ? <Empty>No hay entrevistas todavía.</Empty> : (
        <div className="space-y-3">
          {interviews.map((i) => (
            <details key={i.id} className="rounded-xl border bg-card">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                <StatusBadge s={i.estado} />
                <span className="font-medium">{names[i.person_id ?? ""] ?? "Sin persona"}</span>
                <span className="text-muted-foreground">{INTERVIEW_TYPE[i.tipo]} · {areaName[i.area_id ?? ""] ?? "Sin área"}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {formatDateTime(i.fecha_hora)}{i.duracion_min ? ` · ${i.duracion_min} min` : ""}
                </span>
              </summary>
              <form action={updateInterviewAction.bind(null, id, i.id)} className="grid gap-3 border-t p-3 sm:grid-cols-3">
                <SelectField label="Área" name="area_id" emptyLabel="Sin área" options={areaOpts} defaultValue={i.area_id} />
                <SelectField label="Persona" name="person_id" emptyLabel="Sin asignar" options={personOpts} defaultValue={i.person_id} />
                <SelectField label="Tipo" name="tipo" required options={opts(INTERVIEW_TYPE)} defaultValue={i.tipo} />
                <Field label="Fecha y hora" name="fecha_hora" type="datetime-local" defaultValue={isoToSantiagoLocal(i.fecha_hora)} />
                <Field label="Duración (min)" name="duracion_min" type="number" min={1} defaultValue={i.duracion_min} />
                <SelectField label="Estado" name="estado" required options={opts(INTERVIEW_STATUS)} defaultValue={i.estado} />
                <TextAreaField className="sm:col-span-3" label="Resumen" name="resumen" defaultValue={i.resumen} rows={3} />
                <TextAreaField className="sm:col-span-3" label="Notas privadas (solo tú; nunca las ve el viewer)" name="notas_privadas"
                  defaultValue={noteOf.get(i.id) ?? ""} rows={5} />
                <div className="flex items-center justify-between sm:col-span-3">
                  <SubmitButton>Guardar</SubmitButton>
                </div>
              </form>
              <div className="space-y-2 border-t p-3">
                <p className="text-xs font-medium text-muted-foreground">Procesos que salieron de esta entrevista</p>
                <ul className="flex flex-wrap gap-2 text-sm">
                  {links.filter((l) => l.interview_id === i.id).map((l) => (
                    <li key={l.process_id} className="flex items-center gap-1 rounded-md border px-2 py-0.5">
                      <Link href={`/clientes/${id}/procesos/${l.process_id}`} className="hover:text-primary">{procName[l.process_id]}</Link>
                      <form action={unlinkProcessAction.bind(null, id, i.id, l.process_id)}><button type="submit" className="text-xs text-muted-foreground hover:text-destructive" title="Quitar vínculo">✕</button></form>
                    </li>
                  ))}
                </ul>
                {processes.some((p) => !links.some((l) => l.interview_id === i.id && l.process_id === p.id)) && (
                  <form action={linkProcessAction.bind(null, id, i.id)} className="flex items-end gap-2">
                    <SelectField label="Vincular proceso" name="process_id" required className="flex-1"
                      options={processes.filter((p) => !links.some((l) => l.interview_id === i.id && l.process_id === p.id)).map((p) => ({ value: p.id, label: p.nombre }))} />
                    <SubmitButton size="sm" variant="secondary">Vincular</SubmitButton>
                  </form>
                )}
              </div>
              <div className="border-t p-3">
                <ConfirmDelete action={deleteInterviewAction.bind(null, id, i.id)} what="la entrevista" />
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
