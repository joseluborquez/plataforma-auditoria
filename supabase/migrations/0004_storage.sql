-- 0004_storage.sql · Bucket privado de documentos
-- Ruta de objeto: {client_id}/{uuid}-{nombre}. Las descargas se hacen con URL firmada desde el servidor.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

create policy documents_owner_all on storage.objects for all to authenticated
  using (bucket_id = 'documents' and (select public.is_owner()))
  with check (bucket_id = 'documents' and (select public.is_owner()));

-- El viewer solo puede leer objetos registrados en `documents` como no confidenciales y dentro de su alcance.
create policy documents_viewer_read on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.ruta_storage = storage.objects.name
        and not d.confidencial
        and public.viewer_sees_area(d.client_id, d.area_id)
    )
  );
