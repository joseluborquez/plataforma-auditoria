import Link from "next/link";
import { isoToSantiagoLocal } from "@/lib/format";
import type { Interview } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function InterviewCalendar({
  month, interviews, names, basePath,
}: { month: string; interviews: Interview[]; names: Record<string, string>; basePath: string }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const prev = new Date(Date.UTC(y, m - 2, 1));
  const next = new Date(Date.UTC(y, m, 1));
  const key = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  const byDay = new Map<number, Interview[]>();
  for (const i of interviews) {
    if (!i.fecha_hora) continue;
    const local = isoToSantiagoLocal(i.fecha_hora); // yyyy-mm-ddThh:mm
    if (local.slice(0, 7) !== month) continue;
    const day = Number(local.slice(8, 10));
    byDay.set(day, [...(byDay.get(day) ?? []), i]);
  }
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, idx) => idx - offset + 1);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Link href={`${basePath}?vista=calendario&mes=${key(prev)}`} className="text-sm text-muted-foreground hover:text-foreground">← Anterior</Link>
        <h3 className="font-medium">{MONTHS[m - 1]} {y}</h3>
        <Link href={`${basePath}?vista=calendario&mes=${key(next)}`} className="text-sm text-muted-foreground hover:text-foreground">Siguiente →</Link>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-xs">
        {DAYS.map((d) => <div key={d} className="bg-muted p-1.5 text-center text-muted-foreground">{d}</div>)}
        {cells.map((day, idx) => {
          const inMonth = day >= 1 && day <= daysInMonth;
          const items = inMonth ? byDay.get(day) ?? [] : [];
          return (
            <div key={idx} className={cn("min-h-20 bg-card p-1.5", !inMonth && "opacity-30")}>
              {inMonth && <span className="text-muted-foreground">{day}</span>}
              {items.map((i) => (
                <div key={i.id} className={cn("mt-1 truncate rounded px-1 py-0.5",
                  i.estado === "realizada" ? "bg-emerald-500/20" : "bg-primary/20")}
                  title={`${names[i.person_id ?? ""] ?? "Sin persona"} · ${isoToSantiagoLocal(i.fecha_hora).slice(11)}`}>
                  {isoToSantiagoLocal(i.fecha_hora).slice(11)} {names[i.person_id ?? ""] ?? i.tipo}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
