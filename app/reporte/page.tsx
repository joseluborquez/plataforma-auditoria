import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { rows } from "@/lib/db";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export default async function ReporteIndex() {
  const { supabase, role } = await requireUser();
  const clients = rows<{ id: string; nombre: string; rubro: string | null }>(await supabase.from("report_clients").select("id,nombre,rubro").order("nombre"));
  if (clients.length === 1) redirect(`/reporte/${clients[0].id}`);
  return (
    <main className="mx-auto max-w-lg space-y-4 p-8">
      <h1 className="text-xl font-semibold">Reportes disponibles</h1>
      {clients.length === 0 && <p className="text-sm text-muted-foreground">Tu usuario aún no tiene reportes asignados. Contacta a JLB Systems.</p>}
      {clients.map((c) => (
        <Link key={c.id} href={`/reporte/${c.id}`} className="block rounded-xl border bg-card p-4 hover:bg-accent">{c.nombre}</Link>
      ))}
      <div className="flex gap-2">
        {role === "owner" && <Link href="/clientes" className="text-sm text-muted-foreground hover:text-foreground">← Panel</Link>}
        <form action={logout}><Button type="submit" variant="outline" size="sm">Salir</Button></form>
      </div>
    </main>
  );
}
