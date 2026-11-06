import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { rows } from "@/lib/db";
import { formatHours, formatMinutes } from "@/lib/format";
import { summarize } from "@/lib/hours";
import type { Client, TimeLog } from "@/lib/types";
import { Empty, PageHeader, Panel } from "@/components/form";
import { ActivityBars } from "@/components/hours-summary";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function HorasPage() {
  const { supabase } = await requireOwner();
  const [logs, clients, interviews] = await Promise.all([
    supabase.from("time_log").select("*").then(rows<TimeLog>),
    supabase.from("clients").select("id,nombre").then(rows<Pick<Client, "id" | "nombre">>),
    supabase.from("interviews").select("client_id").eq("estado", "realizada").then(rows<{ client_id: string }>),
  ]);
  const done: Record<string, number> = {};
  for (const i of interviews) done[i.client_id] = (done[i.client_id] ?? 0) + 1;
  const s = summarize(logs, done);
  const name = Object.fromEntries(clients.map((c) => [c.id, c.nombre]));

  return (
    <>
      <PageHeader title="Horas" subtitle={`${formatHours(s.total)} registradas en total`} />
      {logs.length === 0 ? <Empty>Aún no hay horas registradas. Regístralas en la pestaña Horas de cada cliente.</Empty> : (
        <div className="space-y-6">
          <Panel title="Por actividad (todos los clientes)"><ActivityBars byActivity={s.byActivity} /></Panel>
          <Panel title="Por cliente">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Cliente</TableHead><TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Fijas</TableHead><TableHead className="text-right">Por entrevista</TableHead>
                <TableHead className="text-right">Variables</TableHead><TableHead className="text-right">Entrevistas</TableHead>
                <TableHead className="text-right">Prom. por entrevista</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {s.byClient.map((c) => (
                  <TableRow key={c.clientId}>
                    <TableCell><Link href={`/clientes/${c.clientId}/horas`} className="hover:text-primary">{name[c.clientId] ?? "—"}</Link></TableCell>
                    <TableCell className="text-right font-mono">{formatHours(c.total)}</TableCell>
                    <TableCell className="text-right font-mono">{formatHours(c.fijas)}</TableCell>
                    <TableCell className="text-right font-mono">{formatHours(c.porEntrevista)}</TableCell>
                    <TableCell className="text-right font-mono">{formatHours(c.variables)}</TableCell>
                    <TableCell className="text-right font-mono">{c.entrevistasRealizadas}</TableCell>
                    <TableCell className="text-right font-mono">{c.minPorEntrevista != null ? formatMinutes(c.minPorEntrevista) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              Fijas: preparación, reunión de inicio, análisis, mapa de procesos, hoja de ruta y presentación. Por entrevista: traslado, entrevista y transcripción y notas. Variables: el resto.
            </p>
          </Panel>
        </div>
      )}
    </>
  );
}
