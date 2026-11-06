"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  ["", "Resumen"], ["/guion", "Guion"], ["/entrevistas", "Entrevistas"], ["/procesos", "Procesos"], ["/mediciones", "Mediciones"],
  ["/priorizacion", "Priorización"], ["/hoja-de-ruta", "Hoja de ruta"], ["/documentos", "Documentos"], ["/horas", "Horas"],
] as const;

export function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/clientes/${clientId}`;
  return (
    <nav className="no-print mb-6 flex gap-1 overflow-x-auto border-b">
      {TABS.map(([suffix, label]) => {
        const href = base + suffix;
        const active = suffix === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
