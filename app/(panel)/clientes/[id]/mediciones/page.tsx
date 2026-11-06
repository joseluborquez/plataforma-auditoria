import { requireOwner } from "@/lib/auth";
import { rows } from "@/lib/db";
import { formatDateOnly, formatMinutes, todayISO } from "@/lib/format";
import { MEAS_KIND, MEAS_METHOD } from "@/lib/labels";
import { compare, weeklyMinutes, weeklyRange } from "@/lib/measurements";
import type { Measurement, Process } from "@/lib/types";
import { Empty, Field, Panel, SelectField, opts } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { createMeasurementAction, deleteMeasurementAction } from "./actions";

export default async function MedicionesPage({ params }: PageProps<"/clientes/[id]/mediciones">) {
  const { id } = await params;
  const { supabase } = await requireOwner();
  const processes = rows<Process>(await supabase.from("processes").select("*").eq("client_id", id).order("nombre"));
  const ms = rows<Measurement>(processes.length
    ? await supabase.from("time_measurements").select("*").in("process_id", processes.map((p) => p.id)).order("fecha", { ascending: false })
    : { data: [], error: null });

  if (processes.length === 0) return <Empty>Crea procesos primero para poder medirlos.</Empty>;
  return (
    <div className="space-y-6">
      <Panel title="Nueva medición">
        <form action={createMeasurementAction.bind(null, id)} className="grid gap-3 sm:grid-cols-4">
          <SelectField label="Proceso" name="process_id" required className="sm:col-span-2" options={processes.map((p) => ({ value: p.id, label: p.nombre }))} />
          <SelectField label="Tipo" name="tipo" required options={opts(MEAS_KIND)} />
          <Field label="Fecha" name="fecha" type="date" defaultValue={todayISO()} required />
          <Field label="Minutos por vez" name="minutos_por_vez" type="number" min={0} step="any" required />
          <Field label="Veces por semana" name="veces_por_semana" type="number" min={0} step="any" required />
          <Field label="Personas" name="personas" type="number" min={1} defaultValue={1} required />
          <SelectField label="Cómo se obtuvo" name="metodo" required options={opts(MEAS_METHOD)} defaultValue="declarado" />
          <Field label="Mínimo observado (min por vez)" name="minutos_min" type="number" min={0} step="any" placeholder="opcional" />
          <Field label="Máximo observado (min por vez)" name="minutos_max" type="number" min={0} step="any" placeholder="opcional" />
          <Field label="Fuente (sin nombres)" name="fuente" placeholder="Cronometraje, registro…" />
          <div className="sm:col-span-4"><SubmitButton>Registrar medición</SubmitButton></div>
        </form>
      </Panel>

      {processes.map((p) => {
        const list = ms.filter((m) => m.process_id === p.id);
        if (list.length === 0) return null;
        const c = compare(list);
        return (
          <Panel key={p.id} title={p.nombre}>
            {c ? (
              <div className="mb-4 grid gap-3 sm:grid-cols-4">
                {[
                  ["Línea base / semana", formatMinutes(c.baseWeekly)],
                  ["Posterior / semana", formatMinutes(c.postWeekly)],
                  ["Diferencia", `${c.diffMinutes >= 0 ? "−" : "+"}${formatMinutes(Math.abs(c.diffMinutes))}`],
                  ["Variación", c.diffPct === null ? "—" : `${c.diffPct >= 0 ? "−" : "+"}${Math.abs(c.diffPct).toFixed(1).replace(".", ",")}%`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="font-mono text-lg">{v}</p></div>
                ))}
                <p className="text-xs text-muted-foreground sm:col-span-4">
                  {c.declared && <b>Estimación basada en tiempos declarados en entrevista; conviene cronometrar para confirmarla. </b>}
                  Ahorro estimado: {c.annualHoursSaved.toLocaleString("es-CL", { maximumFractionDigits: 0 })} horas al año (52 semanas). Se usa la medición más reciente de cada tipo.
                </p>
              </div>
            ) : <p className="mb-3 text-xs text-muted-foreground">Falta línea base o medición posterior para comparar.</p>}
            <ul className="divide-y text-sm">
              {list.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="flex items-center gap-2">
                    <Badge variant={m.tipo === "linea_base" ? "secondary" : "default"}>{MEAS_KIND[m.tipo]}</Badge>
                    <Badge variant="outline">{MEAS_METHOD[m.metodo]}</Badge>
                    <span className="font-mono">{m.minutos_por_vez} min × {m.veces_por_semana}/sem × {m.personas} pers. = {formatMinutes(weeklyMinutes(m))}/sem
                      {(() => { const r = weeklyRange(m); return r ? ` (rango ${formatMinutes(r[0])}–${formatMinutes(r[1])})` : ""; })()}</span>
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {formatDateOnly(m.fecha)}{m.fuente ? ` · ${m.fuente}` : ""}
                    <ConfirmDelete action={deleteMeasurementAction.bind(null, id, m.id)} what="la medición" />
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        );
      })}
    </div>
  );
}
