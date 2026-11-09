-- 0008_guion_en_vivo.sql · Modo entrevista en vivo
--  · "No aplica" por pregunta
--  · Checklists marcables (antes / después) por entrevista
--  · Tiempo real por sección del guion
-- Todo es solo del dueño: el viewer nunca ve datos de entrevistas.

alter table public.interview_answers add column no_aplica boolean not null default false;

create table public.interview_checks (
  interview_id uuid not null references public.interviews on delete cascade,
  item_key text not null,   -- "pre:0", "post:2"
  done boolean not null default true,
  primary key (interview_id, item_key)
);

create table public.interview_timing (
  interview_id uuid not null references public.interviews on delete cascade,
  seccion int not null check (seccion >= 0),
  segundos int not null default 0 check (segundos >= 0),
  primary key (interview_id, seccion)
);

alter table public.interview_checks enable row level security;
alter table public.interview_checks force row level security;
create policy owner_all on public.interview_checks for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.interview_checks from anon;

alter table public.interview_timing enable row level security;
alter table public.interview_timing force row level security;
create policy owner_all on public.interview_timing for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.interview_timing from anon;
