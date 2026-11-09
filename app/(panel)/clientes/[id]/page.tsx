import { requireOwner } from "@/lib/auth";
import { one, rows } from "@/lib/db";
import { formatHours } from "@/lib/format";
import type { Area, Client, Interview, Person, TimeLog } from "@/lib/types";
import { Empty, Field, Panel, SelectField, TextAreaField } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import {
  createAreaAction, createPersonAction, deleteAreaAction, deleteClientAction,
  deletePersonAction, setEncargadoAction, updateClientAction, updatePersonAction,
} from "../actions";

export default async function ResumenPage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const { supabase } = await requireOwner();
  const [client, areas, people, interviews, logs, procCount] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle().then(one<Client>),
    supabase.from("areas").select("*").eq("client_id", id).order("nombre").then(rows<Area>),
    supabase.from("people").select("*").eq("client_id", id).order("nombre").then(rows<Person>),
    supabase.from("interviews").select("*").eq("client_id", id).then(rows<Interview>),
    supabase.from("time_log").select("*").eq("client_id", id).then(rows<TimeLog>),
    supabase.from("processes").select("id", { count: "exact", head: true }).eq("client_id", id),
  ]);
  if (!client) return null;
  const isEncargado = (p: Person) => p.es_encargado || areas.some((a) => a.encargado_id === p.id);
  const done = interviews.filter((i) => i.estado === "realizada").length;
  const totalMin = logs.reduce((s, l) => s + l.minutos, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Áreas", areas.length], ["Personas", people.length],
          ["Entrevistas realizadas", `${done}/${interviews.length}`], ["Procesos", procCount.count ?? 0],
        ].map(([k, v]) => (
          <Panel key={k as string}><p className="text-xs text-muted-foreground">{k}</p><p className="font-mono text-2xl">{v}</p></Panel>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Horas dedicadas a esta auditoría: <span className="font-mono text-foreground">{formatHours(totalMin)}</span></p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Áreas y encargados">
          {areas.length === 0 && <Empty>Sin áreas. Agrega la primera abajo.</Empty>}
          <ul className="space-y-3">
            {areas.map((a) => {
              const inArea = people.filter((p) => p.area_id === a.id);
              return (
                <li key={a.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{a.nombre}</p>
                    <ConfirmDelete action={deleteAreaAction.bind(null, id, a.id)} what={`el área ${a.nombre}`} />
                  </div>
                  <form action={setEncargadoAction.bind(null, id, a.id)} className="mt-2 flex items-end gap-2">
                    <SelectField label="Encargado" name="encargado_id" className="flex-1" emptyLabel="Sin encargado"
                      defaultValue={a.encargado_id} options={inArea.map((p) => ({ value: p.id, label: p.nombre }))} />
                    <SubmitButton size="sm" variant="secondary">Asignar</SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
          <form action={createAreaAction.bind(null, id)} className="mt-4 flex items-end gap-2 border-t pt-4">
            <Field label="Nueva área" name="nombre" required className="flex-1" />
            <SubmitButton>Agregar</SubmitButton>
          </form>
        </Panel>

        <Panel title="Personas">
          {people.length === 0 && <Empty>Sin personas registradas.</Empty>}
          <ul className="divide-y">
            {people.map((p) => (
              <li key={p.id} className="py-2">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.nombre} {isEncargado(p) && <Badge variant="secondary">Encargado</Badge>}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[p.cargo, areas.find((a) => a.id === p.area_id)?.nombre, p.email, p.telefono].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-primary underline-offset-2 group-open:hidden hover:underline">Editar</span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground group-open:inline">Cerrar</span>
                  </summary>
                  <form action={updatePersonAction.bind(null, id, p.id)} className="mt-3 grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                    <Field label="Nombre" name="nombre" id={`nombre-${p.id}`} defaultValue={p.nombre} required />
                    <Field label="Cargo" name="cargo" id={`cargo-${p.id}`} defaultValue={p.cargo} />
                    <Field label="Correo" name="email" id={`email-${p.id}`} type="email" defaultValue={p.email} />
                    <Field label="Teléfono" name="telefono" id={`telefono-${p.id}`} defaultValue={p.telefono} />
                    <SelectField label="Área" name="area_id" id={`area-${p.id}`} emptyLabel="Sin área" defaultValue={p.area_id}
                      options={areas.map((a) => ({ value: a.id, label: a.nombre }))} />
                    <label className="flex items-center gap-2 self-end pb-2 text-sm">
                      <input type="checkbox" name="es_encargado" defaultChecked={isEncargado(p)} /> Es encargado del área
                    </label>
                    <div className="sm:col-span-2"><SubmitButton size="sm">Guardar cambios</SubmitButton></div>
                  </form>
                  <div className="mt-2 text-right"><ConfirmDelete action={deletePersonAction.bind(null, id, p.id)} what={p.nombre} /></div>
                </details>
              </li>
            ))}
          </ul>
          <form action={createPersonAction.bind(null, id)} className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
            <Field label="Nombre" name="nombre" required />
            <Field label="Cargo" name="cargo" />
            <Field label="Correo" name="email" type="email" />
            <Field label="Teléfono" name="telefono" />
            <SelectField label="Área" name="area_id" emptyLabel="Sin área" options={areas.map((a) => ({ value: a.id, label: a.nombre }))} />
            <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="es_encargado" /> Es encargado del área</label>
            <div className="sm:col-span-2"><SubmitButton>Agregar persona</SubmitButton></div>
          </form>
        </Panel>
      </div>

      <Panel title="Datos del cliente">
        <form action={updateClientAction.bind(null, id)} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre" name="nombre" defaultValue={client.nombre} required />
          <Field label="RUT" name="rut" defaultValue={client.rut} />
          <Field label="Rubro" name="rubro" defaultValue={client.rubro} />
          <Field label="Rango de empleados" name="rango_empleados" defaultValue={client.rango_empleados} />
          <TextAreaField className="sm:col-span-2" label="Notas (privadas, el viewer no las ve)" name="notas" defaultValue={client.notas} />
          <div className="sm:col-span-2 flex items-center justify-between">
            <SubmitButton>Guardar cambios</SubmitButton>
          </div>
        </form>
        <div className="mt-4 border-t pt-3">
          <ConfirmDelete action={deleteClientAction.bind(null, id)} label="Eliminar cliente y todos sus datos" what={`el cliente ${client.nombre}`} />
        </div>
      </Panel>
    </div>
  );
}
