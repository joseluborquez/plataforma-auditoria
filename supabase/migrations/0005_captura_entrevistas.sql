-- 0005_captura_entrevistas.sql · Captura de información en terreno
--  · Estado de avance de cada proceso (identificado → validado)
--  · Tiempo declarado vs medido, con rango mínimo-máximo
--  · Vínculo entrevista ↔ proceso (solo dueño: el viewer nunca sabe qué entrevista originó qué)

create type public.process_stage as enum ('identificado', 'documentado', 'medido', 'puntuado', 'validado');
create type public.meas_method   as enum ('declarado', 'cronometrado', 'registro_sistema');

alter table public.processes
  add column estado_proceso public.process_stage not null default 'identificado';

alter table public.time_measurements
  add column metodo public.meas_method not null default 'declarado',
  add column minutos_min numeric check (minutos_min is null or minutos_min >= 0),
  add column minutos_max numeric check (minutos_max is null or minutos_max >= 0),
  add constraint meas_range_chk check (minutos_min is null or minutos_max is null or minutos_min <= minutos_max);

create table public.interview_processes (
  interview_id uuid not null references public.interviews on delete cascade,
  process_id uuid not null references public.processes on delete cascade,
  primary key (interview_id, process_id)
);
create index on public.interview_processes (process_id);

alter table public.interview_processes enable row level security;
alter table public.interview_processes force row level security;
create policy owner_all on public.interview_processes for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.interview_processes from anon;

-- El viewer sí puede ver el método y el rango de la medición (transparencia), no la fuente.
create or replace view public.report_measurements with (security_invoker = false) as
  select m.id, m.process_id, m.tipo, m.minutos_por_vez, m.veces_por_semana, m.personas, m.fecha,
         m.metodo, m.minutos_min, m.minutos_max
  from public.time_measurements m
  where (select public.is_owner()) or public.viewer_sees_process(m.process_id);
