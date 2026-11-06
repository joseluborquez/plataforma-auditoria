import { formatHours } from "@/lib/format";
import { ACTIVITY } from "@/lib/labels";
import type { Activity } from "@/lib/types";

export function ActivityBars({ byActivity }: { byActivity: Partial<Record<Activity, number>> }) {
  const entries = Object.entries(byActivity).sort((a, b) => b[1]! - a[1]!) as [Activity, number][];
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Sin horas registradas.</p>;
  return (
    <ul className="space-y-2">
      {entries.map(([a, v]) => (
        <li key={a} className="text-sm">
          <div className="mb-1 flex justify-between"><span>{ACTIVITY[a]}</span><span className="font-mono text-muted-foreground">{formatHours(v)}</span></div>
          <div className="h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
