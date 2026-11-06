import { requireOwner } from "@/lib/auth";
import { rows } from "@/lib/db";
import { formatDateOnly, formatHours, formatMinutes, todayISO } from "@/lib/format";
import { ACTIVITY } from "@/lib/labels";
import { summarize } from "@/lib/hours";
import type { TimeLog } from "@/lib/types";
import { Empty, Field, Panel, SelectField, opts } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ActivityBars } from "@/components/hours-summary";
import { createTimeLogAction, deleteTimeLogAction } from "./actions";

export default async function HorasClientePage({ params }: PageProps<"/clientes/[id]/horas">) {
  const { id } = await params;
  const { supabase } = await requireOwner();
  const [logs, done] = await Promise.all([
    supabase.from("time_log").select("*").eq("client_id", id).order("fecha", { ascending: false }).then(rows<TimeLog>),
    supabase.from("interviews").select("id", { count: "exact", head: true }).eq("client_id", id).eq("estado", "realizada"),
  ]);
  const s = summarize(logs, { [id]: done.count ?? 0 });
  const c = s.byClient[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Horas totales", formatHours(s.total)],
          ["Horas fijas", formatHours(c?.fijas ?? 0)],
          ["Horas por entrevista (actividades)", formatHours(c?.porEntrevista ?? 0)],
          ["Promedio por entrevista realizada", c?.minPorEntrevista != null ? formatMinutes(c.minPorEntrevista) : "—"],
        ].map(([k, v]) => <Panel key={k}><p className="text-xs text-muted-foreground">{k}</p><p className="font-mono text-xl">{v}</p></Panel>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Registrar tiempo">
          <form action={createTimeLogAction.bind(null, id)} className="grid gap-3 sm:grid-cols-2">
            <Field label="Fecha" name="fecha" type="date" defaultValue={todayISO()} required />
            <SelectField label="Actividad" name="actividad" required options={opts(ACTIVITY)} />
            <Field label="Horas" name="horas" type="number" min={0} defaultValue={0} />
            <Field label="Minutos" name="minutos" type="number" min={0} max={59} defaultValue={0} />
            <Field label="Detalle" name="detalle" className="sm:col-span-2" />
            <div className="sm:col-span-2"><SubmitButton>Registrar</SubmitButton></div>
          </form>
        </Panel>
        <Panel title="Por actividad"><ActivityBars byActivity={s.byActivity} /></Panel>
      </div>
      {logs.length === 0 ? <Empty>Aún no registras horas para este cliente.</Empty> : (
        <Panel title="Registro">
          <ul className="divide-y text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><span className="font-mono text-xs text-muted-foreground">{formatDateOnly(l.fecha)}</span> · {ACTIVITY[l.actividad]}{l.detalle ? ` — ${l.detalle}` : ""}</span>
                <span className="flex items-center gap-3"><span className="font-mono">{formatMinutes(l.minutos)}</span>
                  <ConfirmDelete action={deleteTimeLogAction.bind(null, id, l.id)} what="el registro" /></span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
