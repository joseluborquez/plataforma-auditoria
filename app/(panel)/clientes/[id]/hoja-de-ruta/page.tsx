import { requireOwner } from "@/lib/auth";
import { rows } from "@/lib/db";
import { PHASE, PRIORITY, RM_STATUS } from "@/lib/labels";
import type { Phase, Process, RoadmapItem } from "@/lib/types";
import { Empty, Field, Panel, SelectField, TextAreaField, opts } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { createRoadmapAction, deleteRoadmapAction, updateRoadmapAction } from "./actions";

const ORDER: Phase[] = ["quick_win", "mediano_plazo", "largo_plazo"];
const PRIO_RANK = { alta: 0, media: 1, baja: 2 } as const;

export default async function HojaDeRutaPage({ params }: PageProps<"/clientes/[id]/hoja-de-ruta">) {
  const { id } = await params;
  const { supabase } = await requireOwner();
  const [items, processes] = await Promise.all([
    supabase.from("roadmap_items").select("*").eq("client_id", id).then(rows<RoadmapItem>),
    supabase.from("processes").select("*").eq("client_id", id).order("nombre").then(rows<Process>),
  ]);
  const procName = Object.fromEntries(processes.map((p) => [p.id, p.nombre]));
  const procOpts = processes.map((p) => ({ value: p.id, label: p.nombre }));

  return (
    <div className="space-y-6">
      <Panel title="Nuevo ítem">
        <form action={createRoadmapAction.bind(null, id)} className="grid gap-3 sm:grid-cols-4">
          <Field label="Título" name="titulo" required className="sm:col-span-2" />
          <SelectField label="Proceso (opcional)" name="process_id" emptyLabel="General" options={procOpts} className="sm:col-span-2" />
          <SelectField label="Fase" name="fase" required options={opts(PHASE)} />
          <SelectField label="Prioridad" name="prioridad" required defaultValue="media" options={opts(PRIORITY)} />
          <SelectField label="Estado" name="estado" required options={opts(RM_STATUS)} />
          <Field label="Esfuerzo estimado" name="esfuerzo_estimado" placeholder="2 semanas" />
          <TextAreaField label="Notas (privadas)" name="notas" rows={2} className="sm:col-span-4" />
          <div className="sm:col-span-4"><SubmitButton>Agregar a la hoja de ruta</SubmitButton></div>
        </form>
      </Panel>

      {items.length === 0 && <Empty>La hoja de ruta está vacía.</Empty>}
      <div className="grid gap-4 lg:grid-cols-3">
        {ORDER.map((fase) => {
          const list = items.filter((i) => i.fase === fase).sort((a, b) => PRIO_RANK[a.prioridad] - PRIO_RANK[b.prioridad]);
          return (
            <Panel key={fase} title={`${PHASE[fase]} (${list.length})`}>
              <div className="space-y-2">
                {list.map((i) => (
                  <details key={i.id} className="rounded-lg border">
                    <summary className="cursor-pointer p-2.5 text-sm">
                      <span className="font-medium">{i.titulo}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant={i.prioridad === "alta" ? "default" : "secondary"}>{PRIORITY[i.prioridad]}</Badge>
                        <Badge variant="outline">{RM_STATUS[i.estado]}</Badge>
                        {i.process_id && <Badge variant="outline">{procName[i.process_id]}</Badge>}
                      </span>
                    </summary>
                    <form action={updateRoadmapAction.bind(null, id, i.id)} className="grid gap-2 border-t p-2.5">
                      <Field label="Título" name="titulo" defaultValue={i.titulo} required />
                      <SelectField label="Proceso" name="process_id" emptyLabel="General" options={procOpts} defaultValue={i.process_id} />
                      <div className="grid grid-cols-3 gap-2">
                        <SelectField label="Fase" name="fase" options={opts(PHASE)} defaultValue={i.fase} />
                        <SelectField label="Prioridad" name="prioridad" options={opts(PRIORITY)} defaultValue={i.prioridad} />
                        <SelectField label="Estado" name="estado" options={opts(RM_STATUS)} defaultValue={i.estado} />
                      </div>
                      <Field label="Esfuerzo estimado" name="esfuerzo_estimado" defaultValue={i.esfuerzo_estimado} />
                      <TextAreaField label="Notas (privadas)" name="notas" rows={2} defaultValue={i.notas} />
                      <SubmitButton size="sm">Guardar</SubmitButton>
                    </form>
                    <div className="border-t p-2.5"><ConfirmDelete action={deleteRoadmapAction.bind(null, id, i.id)} what="el ítem" /></div>
                  </details>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
