-- 0007_respuestas_guion.sql · Respuestas del guion de entrevista
--  · Una respuesta por pregunta del guion y por entrevista (clave "s{sección}q{pregunta}")
--  · Solo dueño: el viewer nunca ve lo que se respondió en una entrevista

create table public.interview_answers (
  interview_id uuid not null references public.interviews on delete cascade,
  pregunta_key text not null,
  respuesta text not null default '',
  updated_at timestamptz not null default now(),
  primary key (interview_id, pregunta_key)
);

create trigger interview_answers_updated before update on public.interview_answers
  for each row execute function public.set_updated_at();

alter table public.interview_answers enable row level security;
alter table public.interview_answers force row level security;
create policy owner_all on public.interview_answers for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.interview_answers from anon;
