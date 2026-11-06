import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { rows } from "@/lib/db";
import type { Client } from "@/lib/types";
import { Empty, Field, PageHeader, Panel, TextAreaField } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { createClientAction } from "./actions";

export default async function ClientesPage() {
  const { supabase } = await requireOwner();
  const clients = rows<Client>(await supabase.from("clients").select("*").order("nombre"));
  return (
    <>
      <PageHeader title="Clientes" subtitle={`${clients.length} cliente(s)`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-2">
          {clients.length === 0 && <Empty>Aún no hay clientes. Crea el primero a la derecha.</Empty>}
          {clients.map((c) => (
            <Link key={c.id} href={`/clientes/${c.id}`}
              className="block rounded-xl border bg-card p-4 transition-colors hover:bg-accent">
              <p className="font-medium">{c.nombre}</p>
              <p className="text-sm text-muted-foreground">
                {[c.rubro, c.rango_empleados && `${c.rango_empleados} empleados`].filter(Boolean).join(" · ") || "Sin datos"}
              </p>
            </Link>
          ))}
        </div>
        <Panel title="Nuevo cliente">
          <form action={createClientAction} className="space-y-3">
            <Field label="Nombre" name="nombre" required />
            <Field label="RUT" name="rut" placeholder="76.000.000-0" />
            <Field label="Rubro" name="rubro" />
            <Field label="Rango de empleados" name="rango_empleados" placeholder="50-100" />
            <TextAreaField label="Notas (privadas)" name="notas" />
            <SubmitButton>Crear cliente</SubmitButton>
          </form>
        </Panel>
      </div>
    </>
  );
}
