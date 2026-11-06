import { requireOwner } from "@/lib/auth";
import { rows } from "@/lib/db";
import type { Area, DocumentRow } from "@/lib/types";
import { Empty, Field, Panel, SelectField } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { deleteDocumentAction, toggleConfidentialAction, uploadDocumentAction } from "./actions";

export default async function DocumentosPage({ params }: PageProps<"/clientes/[id]/documentos">) {
  const { id } = await params;
  const { supabase } = await requireOwner();
  const [areas, docs] = await Promise.all([
    supabase.from("areas").select("*").eq("client_id", id).order("nombre").then(rows<Area>),
    supabase.from("documents").select("*").eq("client_id", id).order("created_at", { ascending: false }).then(rows<DocumentRow>),
  ]);
  const areaName = Object.fromEntries(areas.map((a) => [a.id, a.nombre]));
  const signed = docs.length
    ? (await supabase.storage.from("documents").createSignedUrls(docs.map((d) => d.ruta_storage), 3600)).data ?? []
    : [];
  const urlOf = new Map(signed.flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as [string, string]] : [])));

  return (
    <div className="space-y-6">
      <Panel title="Subir documento (máx. 4 MB)">
        <form action={uploadDocumentAction.bind(null, id)} className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <label htmlFor="archivo" className="text-sm font-medium">Archivo</label>
            <input id="archivo" name="archivo" type="file" required className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm" />
          </div>
          <Field label="Nombre (opcional)" name="nombre" />
          <SelectField label="Área" name="area_id" emptyLabel="Todo el cliente" options={areas.map((a) => ({ value: a.id, label: a.nombre }))} />
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="confidencial" defaultChecked /> Confidencial (oculto al viewer)</label>
          <div className="sm:col-span-3"><SubmitButton>Subir</SubmitButton></div>
        </form>
      </Panel>
      {docs.length === 0 ? <Empty>No hay documentos.</Empty> : (
        <Panel>
          <ul className="divide-y">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  {urlOf.get(d.ruta_storage)
                    ? <a href={urlOf.get(d.ruta_storage)} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary">{d.nombre}</a>
                    : <span className="font-medium">{d.nombre}</span>}
                  <span className="ml-2 text-xs text-muted-foreground">{areaName[d.area_id ?? ""] ?? "Todo el cliente"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <form action={toggleConfidentialAction.bind(null, id, d.id, d.confidencial)}>
                    <button type="submit" title="Cambiar visibilidad">
                      <Badge variant={d.confidencial ? "destructive" : "secondary"}>{d.confidencial ? "Confidencial" : "Visible al viewer"}</Badge>
                    </button>
                  </form>
                  <ConfirmDelete action={deleteDocumentAction.bind(null, id, d.id, d.ruta_storage)} what={d.nombre} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
