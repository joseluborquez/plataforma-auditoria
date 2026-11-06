import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export default async function PanelLayout({ children }: LayoutProps<"/">) {
  const { user } = await requireOwner();
  return (
    <div className="flex min-h-screen">
      <aside className="no-print hidden w-56 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Link href="/clientes" className="mb-6 block">
          <span className="font-mono text-xs text-muted-foreground">JLB Systems</span>
          <span className="block font-semibold">Auditorías</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 text-sm">
          <Link href="/clientes" className="rounded-md px-2 py-1.5 hover:bg-accent">Clientes</Link>
          <Link href="/horas" className="rounded-md px-2 py-1.5 hover:bg-accent">Horas</Link>
        </nav>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        <form action={logout} className="mt-2">
          <Button type="submit" variant="outline" size="sm" className="w-full">Salir</Button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
