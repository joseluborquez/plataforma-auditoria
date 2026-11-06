-- 0001_schema.sql · Esquema base del panel de auditorías (JLB Systems)
-- Las políticas RLS están en 0003. NO usar estas tablas sin ejecutar 0003.

create extension if not exists pgcrypto;

-- ───────────── Tipos ─────────────
create type public.app_role         as enum ('owner', 'viewer');
create type public.interview_type   as enum ('encargado', 'trabajador');
create type public.interview_status as enum ('pendiente', 'agendada', 'realizada');
create type public.data_state       as enum ('estructurados', 'dispersos', 'en_papel', 'inexistentes');
create type public.meas_kind        as enum ('linea_base', 'posterior');
create type public.decision_t       as enum ('automatizar', 'integrar_ia', 'no_tocar');
create type public.phase_t          as enum ('quick_win', 'mediano_plazo', 'largo_plazo');
create type public.priority_t       as enum ('alta', 'media', 'baja');
create type public.rm_status        as enum ('pendiente', 'en_curso', 'hecho', 'descartado');
create type public.activity_t       as enum (
  'preparacion', 'traslado', 'reunion_inicio', 'entrevista', 'transcripcion_notas',
  'medicion_tiempos', 'analisis', 'mapa_procesos', 'hoja_ruta', 'presentacion',
  'comunicacion_cliente', 'desarrollo_interno', 'otro'
);

-- ───────────── Utilidad ─────────────
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────── Perfiles (rol por usuario) ─────────────
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  role public.app_role not null default 'viewer',
  nombre text
);

-- Todo usuario nuevo nace como viewer sin alcance (no ve nada). El dueño se promueve con scripts/create-user.ts.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, role) values (new.id, 'viewer');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Clientes, áreas, personas ─────────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rut text,
  rubro text,
  rango_empleados text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clients_updated before update on public.clients
  for each row execute function public.set_updated_at();

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  nombre text not null,
  encargado_id uuid,  -- FK a people más abajo (referencia circular)
  unique (client_id, nombre)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  area_id uuid references public.areas on delete set null,
  nombre text not null,
  cargo text,
  email text,
  telefono text,
  es_encargado boolean not null default false
);
alter table public.areas add constraint areas_encargado_fk
  foreign key (encargado_id) references public.people (id) on delete set null;

-- ───────────── Entrevistas ─────────────
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  area_id uuid references public.areas on delete set null,
  person_id uuid references public.people on delete set null,
  tipo public.interview_type not null,
  fecha_hora timestamptz,
  duracion_min int check (duracion_min is null or duracion_min > 0),
  estado public.interview_status not null default 'pendiente',
  resumen text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger interviews_updated before update on public.interviews
  for each row execute function public.set_updated_at();

-- Notas privadas: tabla separada, solo accesible por el dueño.
create table public.interview_notes (
  interview_id uuid primary key references public.interviews on delete cascade,
  notas_privadas text not null default ''
);

-- ───────────── Procesos ─────────────
create table public.processes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  area_id uuid not null references public.areas on delete cascade,
  nombre text not null,
  responsable text,   -- privado: el viewer no lo ve (vista report_processes)
  disparador text,
  pasos jsonb not null default '[]'::jsonb,
  herramientas text[] not null default '{}',
  problemas text,
  estado_datos public.data_state,
  sipoc jsonb not null default '{"proveedores":[],"entradas":[],"proceso":[],"salidas":[],"clientes":[]}'::jsonb,
  evidencia text,     -- privado
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger processes_updated before update on public.processes
  for each row execute function public.set_updated_at();

create table public.time_measurements (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes on delete cascade,
  tipo public.meas_kind not null,
  minutos_por_vez numeric not null check (minutos_por_vez >= 0),
  veces_por_semana numeric not null check (veces_por_semana >= 0),
  personas int not null default 1 check (personas > 0),
  fecha date not null,
  fuente text  -- privado: el viewer no lo ve (vista report_measurements)
);

create table public.scores (
  process_id uuid primary key references public.processes on delete cascade,
  frecuencia_volumen smallint not null check (frecuencia_volumen between 1 and 5),
  tiempo             smallint not null check (tiempo between 1 and 5),
  repetitivo_reglas  smallint not null check (repetitivo_reglas between 1 and 5),
  entradas_digitales smallint not null check (entradas_digitales between 1 and 5),
  errores_retrabajo  smallint not null check (errores_retrabajo between 1 and 5),
  quien_lo_asume     smallint not null check (quien_lo_asume between 1 and 5),
  impacto int generated always as (
    frecuencia_volumen + tiempo + repetitivo_reglas + entradas_digitales + errores_retrabajo + quien_lo_asume
  ) stored,
  riesgo_legal boolean not null default false,
  esfuerzo smallint not null check (esfuerzo between 1 and 5),
  decision public.decision_t
);

-- ───────────── Hoja de ruta, documentos, horas ─────────────
create table public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  process_id uuid references public.processes on delete set null,
  titulo text not null,
  fase public.phase_t not null,
  prioridad public.priority_t not null,
  estado public.rm_status not null default 'pendiente',
  esfuerzo_estimado text,
  notas text,  -- privado: el viewer no lo ve (vista report_roadmap)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger roadmap_updated before update on public.roadmap_items
  for each row execute function public.set_updated_at();

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  area_id uuid references public.areas on delete set null,
  nombre text not null,
  ruta_storage text not null unique,
  confidencial boolean not null default true,  -- seguro por defecto
  created_at timestamptz not null default now()
);

create table public.time_log (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  client_id uuid not null references public.clients on delete cascade,
  actividad public.activity_t not null,
  minutos int not null check (minutos > 0),
  detalle text
);

-- Alcance de los usuarios de solo lectura. area_id NULL = alcance global del cliente.
create table public.viewers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  area_id uuid references public.areas on delete cascade,
  unique nulls not distinct (user_id, client_id, area_id)
);

-- ───────────── Índices en llaves foráneas ─────────────
create index on public.areas (client_id);
create index on public.areas (encargado_id);
create index on public.people (client_id);
create index on public.people (area_id);
create index on public.interviews (client_id);
create index on public.interviews (area_id);
create index on public.interviews (person_id);
create index on public.processes (client_id);
create index on public.processes (area_id);
create index on public.time_measurements (process_id);
create index on public.roadmap_items (client_id);
create index on public.roadmap_items (process_id);
create index on public.documents (client_id);
create index on public.documents (area_id);
create index on public.time_log (client_id, fecha);
create index on public.viewers (user_id);
create index on public.viewers (client_id);
create index on public.viewers (area_id);
