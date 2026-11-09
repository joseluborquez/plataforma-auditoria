-- 0013_problemas_y_prioridades.sql · Problemas dichos en la entrevista, y prioridades y condiciones del cambio
--  Cada problema puede ligarse a un proceso (y a un paso de su mapa) o quedar como hallazgo general del área.
--  Solo dueño: es lo que dijo la persona en la entrevista. El viewer no ve esta tabla.

create type public.problem_type as enum ('error', 'dependencia', 'riesgo_legal', 'espera', 'otro');

create table public.interview_problems (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews on delete cascade,
  process_id uuid references public.processes on delete set null,   -- null = hallazgo general del área
  step_id uuid references public.process_steps on delete set null,
  tipo public.problem_type not null default 'error',
  texto text not null check (length(btrim(texto)) > 0),
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.interview_problems (interview_id);
create index on public.interview_problems (process_id);
create trigger interview_problems_updated before update on public.interview_problems
  for each row execute function public.set_updated_at();

alter table public.interview_problems enable row level security;
alter table public.interview_problems force row level security;
create policy owner_all on public.interview_problems for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.interview_problems from anon;

-- ───────────── Prioridades y condiciones (sección 6) ─────────────
-- Lo declarado sobre cada tarea queda en el vínculo entrevista ↔ proceso (ya es solo dueño).
alter table public.interview_processes
  add column prioridad smallint check (prioridad is null or prioridad between 1 and 3),  -- 1 = la que más quisiera eliminar o cambiar
  add column idea text,
  add column restricciones text[] not null default '{}',
  add column aprueba text;

-- Lo que vale para toda el área (no para una tarea en particular). interviews ya es solo dueño.
alter table public.interviews
  add column restricciones text[] not null default '{}',
  add column aprueba text;
