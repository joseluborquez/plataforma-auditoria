-- 0014_preparacion_implementar.sql · Lo necesario para implementar automatizaciones o IA
--  · Fuentes de conocimiento de cada proceso (qué documentos o saberes usa la gente) → base de un RAG
--  · Acceso a las herramientas del cliente (API, exportación, quién las administra)
--  · Volumen de casos y material de ejemplo pedido al cliente
-- Todo solo del dueño. El reporte del cliente (vista report_processes) no incluye estas columnas.

create table public.process_sources (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes on delete cascade,
  orden int not null default 0 check (orden >= 0),
  nombre text not null check (length(btrim(nombre)) > 0),
  formato text not null default 'documento' check (formato in ('documento', 'planilla', 'correo', 'sistema', 'papel', 'tacito')),
  ubicacion text,
  vigencia text not null default 'no_se' check (vigencia in ('al_dia', 'desactualizado', 'no_se')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.process_sources (process_id, orden);
create trigger process_sources_updated before update on public.process_sources
  for each row execute function public.set_updated_at();

-- Una herramienta del cliente se describe una sola vez, aunque la usen varios procesos.
create table public.client_tools (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  nombre_key text generated always as (lower(btrim(nombre))) stored,
  acceso text not null default 'no_se' check (acceso in ('api', 'exporta', 'manual', 'no_se')),
  administra text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, nombre_key)
);
create trigger client_tools_updated before update on public.client_tools
  for each row execute function public.set_updated_at();

alter table public.processes
  add column casos_por_mes numeric check (casos_por_mes is null or casos_por_mes >= 0),
  add column ejemplos jsonb not null default '{"entrada":"pendiente","salida":"pendiente","error":"pendiente"}'::jsonb;

alter table public.process_sources enable row level security;
alter table public.process_sources force row level security;
create policy owner_all on public.process_sources for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.process_sources from anon;

alter table public.client_tools enable row level security;
alter table public.client_tools force row level security;
create policy owner_all on public.client_tools for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.client_tools from anon;
