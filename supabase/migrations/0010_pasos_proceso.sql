-- 0010_pasos_proceso.sql · Mapa del proceso: pasos estructurados
--  Cada paso tiene tipo, quién lo hace, herramienta, tiempo (mín–máx) y marca de problema.
--  El diagrama se dibuja a partir de estos pasos. Solo dueño (el viewer verá una vista segura en 0011).

create type public.step_type as enum ('accion', 'decision', 'espera', 'sistema');

create table public.process_steps (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes on delete cascade,
  orden int not null check (orden >= 0),
  texto text not null check (length(btrim(texto)) > 0),
  tipo public.step_type not null default 'accion',
  actor text,            -- privado: puede ser una persona
  herramienta text,
  minutos_min numeric check (minutos_min is null or minutos_min >= 0),
  minutos_max numeric check (minutos_max is null or minutos_max >= 0),
  problema boolean not null default false,
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint steps_range_chk check (minutos_min is null or minutos_max is null or minutos_min <= minutos_max)
);
create index on public.process_steps (process_id, orden);
create trigger process_steps_updated before update on public.process_steps
  for each row execute function public.set_updated_at();

alter table public.process_steps enable row level security;
alter table public.process_steps force row level security;
create policy owner_all on public.process_steps for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.process_steps from anon;
