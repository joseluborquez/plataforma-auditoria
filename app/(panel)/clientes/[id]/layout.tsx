import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { one } from "@/lib/db";
import type { Client } from "@/lib/types";
import { ClientTabs } from "@/components/client-tabs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function ClientLayout({ children, params }: LayoutProps<"/clientes/[id]">) {
  const { id } = await params;
  const { supabase } = await requireOwner();
  const client = one<Client>(await supabase.from("clients").select("*").eq("id", id).maybeSingle());
  if (!client) notFound();
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/clientes" className="text-xs text-muted-foreground hover:text-foreground">← Clientes</Link>
          <h1 className="text-2xl font-semibold tracking-tight">{client.nombre}</h1>
          <p className="text-sm text-muted-foreground">{client.rubro ?? "Sin rubro"}</p>
        </div>
        <Link href={`/reporte/${id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Ver reporte del cliente
        </Link>
      </div>
      <ClientTabs clientId={id} />
      {children}
    </>
  );
}
