import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { rows } from "@/lib/db";
import { formatDate, formatMinutes } from "@/lib/format";
import { DATA_STATE, DECISION, PHASE, PRIORITY, RM_STATUS } from "@/lib/labels";
import { compare } from "@/lib/measurements";
import { quadrantOf, QUADRANT_LABEL } from "@/lib/scoring";
import { methodology } from "@/lib/methodology";
import type { Area, DocumentRow, Measurement, Phase, ReportProcess, RoadmapItem, Score } from "@/lib/types";
import { PrintButton } from "@/components/print-button";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PHASES: Phase[] = ["quick_win", "mediano_plazo", "largo_plazo"];

export default async function ReportePage({ params }: PageProps<"/reporte/[clientId]">) {
  const { clientId } = await params;
  const { supabase, role } = await requireUser();

  // Solo vistas/tablas seguras para el viewer. El filtro de alcance lo aplica la base de datos (RLS).
  const client = rows<{ id: string; nombre: string; rubro: string | null; rango_empleados: string | null }>(
    await supabase.from("report_clients").select("*").eq("id", clientId),
  )[0];
  if (!client) notFound();

  const [areas, processes, roadmap, docs] = await Promise.all([
    supabase.from("areas").select("*").eq("client_id", clientId).order("nombre").then(rows<Area>),
    supabase.from("report_processes").select("*").eq("client_id", clientId).order("nombre").then(rows<ReportProcess>),
    supabase.from("report_roadmap").select("*").eq("client_id", clientId).then(rows<RoadmapItem>),
    supabase.from("documents").select("*").eq("client_id", clientId).eq("confidencial", false).then(rows<DocumentRow>),
  ]);
  const ids = processes.map((p) => p.id);
  const [scores, ms] = ids.length ? await Promise.all([
    supabase.from("scores").select("*").in("process_id", ids).then(rows<Score>),
    supabase.from("report_measurements").select("*").in("process_id", ids).then(rows<Measurement>),
  ]) : [[] as Score[], [] as Measurement[]];
  const scoreOf = new Map(scores.map((s) => [s.process_id, s]));
  const signed = docs.length ? (await supabase.storage.from("documents").createSignedUrls(docs.map((d) => d.ruta_storage), 3600)).data ?? [] : [];
  const urlOf = new Map(signed.flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as [string, string]] : [])));
  const procName = Object.fromEntries(processes.map((p) => [p.id, p.nombre]));
  const ranked = processes.map((p) => ({ p, s: scoreOf.get(p.id) })).filter((r) => r.s)
    .sort((a, b) => b.s!.impacto - a.s!.impacto || a.s!.esfuerzo - b.s!.esfuerzo);

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-6 md:p-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div>
          <p className="font-mono text-xs text-muted-foreground">JLB Systems · Informe de auditoría de procesos</p>
          <h1 className="text-3xl font-semibold tracking-tight">{client.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {[client.rubro, client.rango_empleados && `${client.rango_empleados} empleados`].filter(Boolean).join(" · ")} · Emitido el {formatDate(new Date())}
          </p>
        </div>
        <div className="no-print flex gap-2">
          {role === "owner" && <Link href={`/clientes/${clientId}`} className="self-center text-sm text-muted-foreground hover:text-foreground">← Panel</Link>}
          <PrintButton />
          <form action={logout}><Button type="submit" variant="ghost" size="sm">Salir</Button></form>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">1. Priorización de procesos</h2>
        {ranked.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay procesos puntuados.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2">Proceso</th><th>Impacto</th><th>Esfuerzo</th><th>Clasificación</th><th>Decisión</th>
            </tr></thead>
            <tbody>
              {ranked.map(({ p, s }) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{p.nombre}</td>
                  <td className="font-mono">{s!.impacto}/30</td><td className="font-mono">{s!.esfuerzo}/5</td>
                  <td className="text-xs">{QUADRANT_LABEL[quadrantOf(s!.impacto, s!.esfuerzo)].split(" (")[0]}</td>
                  <td>{s!.decision ? DECISION[s!.decision] : "—"}{s!.riesgo_legal ? " · riesgo legal" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="print-break space-y-6">
        <h2 className="text-lg font-semibold">2. Hallazgos por proceso</h2>
        {areas.map((a) => {
          const list = processes.filter((p) => p.area_id === a.id);
          if (list.length === 0) return null;
          return (
            <div key={a.id} className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">{a.nombre}</h3>
              {list.map((p) => {
                const s = scoreOf.get(p.id);
                const c = compare(ms.filter((m) => m.process_id === p.id));
                return (
                  <article key={p.id} className="break-inside-avoid space-y-3 rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-medium">{p.nombre}</h4>
                      <div className="flex gap-1.5">
                        {s && <Badge variant="secondary">Impacto {s.impacto}/30</Badge>}
                        {p.estado_datos && <Badge variant="outline">{DATA_STATE[p.estado_datos]}</Badge>}
                      </div>
                    </div>
                    {p.disparador && <p className="text-sm"><span className="text-muted-foreground">Disparador: </span>{p.disparador}</p>}
                    {p.pasos?.length > 0 && <ol className="list-decimal pl-5 text-sm">{p.pasos.map((x, i) => <li key={i}>{x}</li>)}</ol>}
                    {p.herramientas?.length > 0 && <p className="text-sm"><span className="text-muted-foreground">Herramientas: </span>{p.herramientas.join(", ")}</p>}
                    {p.problemas && <p className="whitespace-pre-line text-sm"><span className="text-muted-foreground">Problemas: </span>{p.problemas}</p>}
                    {p.sipoc && (
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        {([["proveedores", "Proveedores"], ["entradas", "Entradas"], ["proceso", "Proceso"], ["salidas", "Salidas"], ["clientes", "Clientes"]] as const).map(([k, l]) => (
                          <div key={k} className="rounded border p-2"><p className="mb-1 font-medium text-muted-foreground">{l}</p>
                            <ul className="space-y-0.5">{(p.sipoc[k] ?? []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                        ))}
                      </div>
                    )}
                    {c && (
                      <p className="rounded-lg bg-muted p-3 text-sm">
                        <span className="font-medium">Medición de tiempos: </span>
                        {formatMinutes(c.baseWeekly)}/semana antes → {formatMinutes(c.postWeekly)}/semana después
                        ({c.diffMinutes >= 0 ? "ahorro de " : "aumento de "}{formatMinutes(Math.abs(c.diffMinutes))}
                        {c.diffPct !== null && `, ${Math.abs(c.diffPct).toFixed(1).replace(".", ",")}%`}).
                        {c.declared && <span className="text-muted-foreground"> Estimación basada en tiempos declarados por el equipo.</span>}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          );
        })}
      </section>

      <section className="print-break">
        <h2 className="mb-3 text-lg font-semibold">3. Hoja de ruta</h2>
        {roadmap.length === 0 ? <p className="text-sm text-muted-foreground">Sin ítems.</p> : (
          <div className="grid gap-4 md:grid-cols-3">
            {PHASES.map((f) => (
              <div key={f}>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">{PHASE[f]}</h3>
                <ul className="space-y-2 text-sm">
                  {roadmap.filter((r) => r.fase === f).map((r) => (
                    <li key={r.id} className="break-inside-avoid rounded-lg border p-2.5">
                      <p className="font-medium">{r.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {PRIORITY[r.prioridad]} · {RM_STATUS[r.estado]}{r.esfuerzo_estimado ? ` · ${r.esfuerzo_estimado}` : ""}{r.process_id ? ` · ${procName[r.process_id] ?? ""}` : ""}
                        {` · Riesgo: ${r.nivel_riesgo ?? "pendiente de revisión"}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="print-break space-y-4">
        <h2 className="text-lg font-semibold">4. Alcance, método y limitaciones</h2>
        {methodology(client.nombre).map((sec) => (
          <div key={sec.titulo} className="break-inside-avoid">
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">{sec.titulo}</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">{sec.items.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        ))}
      </section>

      {docs.length > 0 && (
        <section className="no-print">
          <h2 className="mb-3 text-lg font-semibold">5. Documentos</h2>
          <ul className="space-y-1 text-sm">
            {docs.map((d) => (
              <li key={d.id}>{urlOf.get(d.ruta_storage)
                ? <a href={urlOf.get(d.ruta_storage)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{d.nombre}</a> : d.nombre}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
