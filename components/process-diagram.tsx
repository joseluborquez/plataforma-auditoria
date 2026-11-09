import { useId } from "react";
import { HEAD_H, LANE_W, NODE_H, NODE_W, layoutSteps } from "@/lib/process-map";
import type { ProcessStep } from "@/lib/types";

/** Diagrama de flujo en carriles, dibujado a partir de los pasos. Usa las variables de color del tema. */
export function ProcessDiagram({ steps, onSelect, label = "Diagrama del proceso" }: {
  steps: ProcessStep[]; onSelect?: (stepId: string) => void; label?: string;
}) {
  const uid = useId();
  const marker = `arrow-${uid.replace(/:/g, "")}`;
  const l = layoutSteps(steps);
  if (l.nodes.length === 0) {
    return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">El diagrama aparecerá aquí a medida que agregues pasos.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${l.width} ${l.height}`} width={l.width} height={l.height} role="img" aria-label={label} className="max-w-none">
        <defs>
          <marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--muted-foreground)" />
          </marker>
        </defs>
        {l.lanes.map((lane, i) => (
          <g key={lane.name}>
            <rect x={lane.x - LANE_W / 2} y={0} width={LANE_W} height={l.height} fill="var(--muted)" opacity={i % 2 ? 0.55 : 0.25} />
            <text x={lane.x} y={HEAD_H / 2 + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--foreground)">
              {lane.name.length > 24 ? lane.name.slice(0, 23) + "…" : lane.name}
            </text>
          </g>
        ))}
        {l.edges.map((e, i) => (
          <g key={i}>
            <path d={e.path} fill="none" stroke="var(--muted-foreground)" strokeWidth={1.5} markerEnd={`url(#${marker})`} />
            {e.label && <text x={e.label.x} y={e.label.y} fontSize={10} fill="var(--muted-foreground)">{e.label.text}</text>}
          </g>
        ))}
        {l.nodes.map((n) => {
          const x = n.cx - NODE_W / 2, y = n.cy - NODE_H / 2;
          const stroke = n.step.problema ? "var(--destructive)" : "var(--border)";
          const sw = n.step.problema ? 2 : 1.5;
          const lineH = 13;
          const textTop = n.cy - ((n.lines.length - 1) * lineH) / 2 - (n.caption ? 6 : 0);
          return (
            <g key={n.step.id} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined}
              onClick={onSelect ? () => onSelect(n.step.id) : undefined}
              onKeyDown={onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(n.step.id); } } : undefined}
              style={onSelect ? { cursor: "pointer" } : undefined}>
              <title>{n.step.texto}</title>
              {n.step.tipo === "decision" ? (
                <polygon points={`${n.cx},${y} ${x + NODE_W},${n.cy} ${n.cx},${y + NODE_H} ${x},${n.cy}`} fill="var(--card)" stroke={stroke} strokeWidth={sw} />
              ) : (
                <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={8} fill="var(--card)" stroke={stroke} strokeWidth={sw}
                  strokeDasharray={n.step.tipo === "espera" ? "5 4" : undefined} />
              )}
              {n.step.tipo === "sistema" && <rect x={x} y={y} width={6} height={NODE_H} rx={3} fill="var(--primary)" />}
              {n.lines.map((ln, i) => (
                <text key={i} x={n.cx} y={textTop + i * lineH + 4} textAnchor="middle" fontSize={12} fill="var(--foreground)">{ln}</text>
              ))}
              {n.caption && (
                <text x={n.cx} y={n.cy + NODE_H / 2 - 9} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
                  {n.caption.length > 30 ? n.caption.slice(0, 29) + "…" : n.caption}
                </text>
              )}
              <circle cx={x + 3} cy={y + 3} r={9} fill="var(--background)" stroke="var(--border)" />
              <text x={x + 3} y={y + 7} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">{n.index + 1}</text>
              {n.step.problema && (
                <g>
                  <circle cx={x + NODE_W - 3} cy={y + 3} r={9} fill="var(--destructive)" />
                  <text x={x + NODE_W - 3} y={y + 7.5} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--primary-foreground)">!</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
