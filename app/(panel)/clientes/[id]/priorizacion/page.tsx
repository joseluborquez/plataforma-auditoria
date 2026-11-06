import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { rows } from "@/lib/db";
import { DECISION } from "@/lib/labels";
import { HIGH_EFFORT, HIGH_IMPACT, quadrantOf, QUADRANT_LABEL, type Quadrant } from "@/lib/scoring";
import type { Area, Process, Score } from "@/lib/types";
import { Empty, Panel } from "@/components/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PriorizacionPage({ params }: PageProps<"/clientes/[id]/priorizacion">) {
  const { id } = await params;
  const { supabase } = await requireOwner();
  const [areas, processes] = await Promise.all([
    supabase.from("areas").select("*").eq("client_id", id).then(rows<Area>),
    supabase.from("processes").select("*").eq("client_id", id).then(rows<Process>),
  ]);
  const scores = rows<Score>(processes.length
    ? await supabase.from("scores").select("*").in("process_id", processes.map((p) => p.id))
    : { data: [], error: null });
  const areaName = Object.fromEntries(areas.map((a) => [a.id, a.nombre]));
  const scored = scores
    .map((s) => ({ s, p: processes.find((p) => p.id === s.process_id)! }))
    .filter((r) => r.p)
    .sort((a, b) => b.s.impacto - a.s.impacto || a.s.esfuerzo - b.s.esfuerzo);
  const unscored = processes.filter((p) => !scores.some((s) => s.process_id === p.id));

  const boxes: Quadrant[][] = [["quick_win", "estrategico"], ["relleno", "evitar"]];
  const tone: Record<Quadrant, string> = {
    quick_win: "border-emerald-500/40", estrategico: "border-primary/50", relleno: "border-border", evitar: "border-destructive/40",
  };

  if (processes.length === 0) return <Empty>No hay procesos para priorizar.</Empty>;
  return (
    <div className="space-y-6">
      <Panel title={`Matriz impacto vs esfuerzo (impacto alto ≥ ${HIGH_IMPACT}, esfuerzo alto ≥ ${HIGH_EFFORT})`}>
        <div className="grid gap-3 md:grid-cols-2">
          {boxes.flat().map((q) => (
            <div key={q} className={`min-h-28 rounded-lg border p-3 ${tone[q]}`}>
              <p className="mb-2 text-xs text-muted-foreground">{QUADRANT_LABEL[q]}</p>
              <ul className="space-y-1 text-sm">
                {scored.filter((r) => quadrantOf(r.s.impacto, r.s.esfuerzo) === q).map(({ s, p }) => (
                  <li key={p.id}>
                    <Link href={`/clientes/${id}/procesos/${p.id}`} className="hover:text-primary">{p.nombre}</Link>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">I{s.impacto} · E{s.esfuerzo}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Tabla de priorización">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proceso</TableHead><TableHead>Área</TableHead>
              <TableHead className="text-right">Impacto</TableHead><TableHead className="text-right">Esfuerzo</TableHead>
              <TableHead>Riesgo legal</TableHead><TableHead>Decisión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scored.map(({ s, p }) => (
              <TableRow key={p.id}>
                <TableCell><Link href={`/clientes/${id}/procesos/${p.id}`} className="hover:text-primary">{p.nombre}</Link></TableCell>
                <TableCell>{areaName[p.area_id]}</TableCell>
                <TableCell className="text-right font-mono">{s.impacto}</TableCell>
                <TableCell className="text-right font-mono">{s.esfuerzo}</TableCell>
                <TableCell>{s.riesgo_legal ? <Badge variant="destructive">Sí</Badge> : "No"}</TableCell>
                <TableCell>{s.decision ? <Badge variant="secondary">{DECISION[s.decision]}</Badge> : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {unscored.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">Sin puntuar: {unscored.map((p) => p.nombre).join(", ")}</p>
        )}
      </Panel>
    </div>
  );
}
