import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { rows } from "@/lib/db";
import { DECISION, PROCESS_STAGE } from "@/lib/labels";
import type { Area, Process, Score } from "@/lib/types";
import { Empty, Field, Panel, SelectField, TextAreaField } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { createProcessAction, inventoryAction } from "./actions";

export default async function ProcesosPage({ params }: PageProps<"/clientes/[id]/procesos">) {
  const { id } = await params;
  const { supabase } = await requireOwner();
  const [areas, processes] = await Promise.all([
    supabase.from("areas").select("*").eq("client_id", id).order("nombre").then(rows<Area>),
    supabase.from("processes").select("*").eq("client_id", id).order("nombre").then(rows<Process>),
  ]);
  const scores = rows<Score>(processes.length
    ? await supabase.from("scores").select("*").in("process_id", processes.map((p) => p.id))
    : { data: [], error: null });
  const scoreOf = new Map(scores.map((s) => [s.process_id, s]));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        {processes.length === 0 && <Empty>Aún no hay procesos. Crea el primero a la derecha.</Empty>}
        {areas.map((a) => {
          const list = processes.filter((p) => p.area_id === a.id);
          if (list.length === 0) return null;
          return (
            <Panel key={a.id} title={a.nombre}>
              <ul className="divide-y">
                {list.map((p) => {
                  const s = scoreOf.get(p.id);
                  return (
                    <li key={p.id}>
                      <Link href={`/clientes/${id}/procesos/${p.id}`} className="flex items-center justify-between gap-3 py-2 hover:text-primary">
                        <span className="flex items-center gap-2 text-sm font-medium">{p.nombre}
                          <Badge variant={p.estado_proceso === "validado" ? "default" : "outline"}>{PROCESS_STAGE[p.estado_proceso]}</Badge></span>
                        <span className="flex items-center gap-2 text-xs">
                          {s ? (<><span className="font-mono text-muted-foreground">Impacto {s.impacto} · Esf. {s.esfuerzo}</span>
                            {s.decision && <Badge variant="secondary">{DECISION[s.decision]}</Badge>}</>)
                            : <Badge variant="outline">Sin puntuar</Badge>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          );
        })}
      </div>
      <div className="space-y-4">
        <Panel title="Inventario rápido (una tarea por línea)">
          {areas.length === 0 ? <Empty>Crea áreas primero (pestaña Resumen).</Empty> : (
            <form action={inventoryAction.bind(null, id)} className="space-y-3">
              <SelectField label="Área" name="area_id" required options={areas.map((a) => ({ value: a.id, label: a.nombre }))} />
              <TextAreaField label="Tareas recurrentes que mencionó la persona" name="tareas" rows={6} placeholder={"Liquidación de sueldos\nControl de asistencia\nContratos nuevos"} />
              <SubmitButton>Crear como «Identificado»</SubmitButton>
            </form>
          )}
        </Panel>
      <Panel title="Nuevo proceso">
        {areas.length === 0 ? <Empty>Crea áreas primero (pestaña Resumen).</Empty> : (
          <form action={createProcessAction.bind(null, id)} className="space-y-3">
            <Field label="Nombre" name="nombre" required />
            <SelectField label="Área" name="area_id" required options={areas.map((a) => ({ value: a.id, label: a.nombre }))} />
            <SubmitButton>Crear y abrir ficha</SubmitButton>
          </form>
        )}
      </Panel>
      </div>
    </div>
  );
}
