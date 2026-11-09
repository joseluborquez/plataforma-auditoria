-- 0011_excepciones_proceso.sql · Excepciones del proceso (casos en que se hace distinto)
-- processes ya tiene RLS solo dueño; el viewer lee por la vista report_processes, que no incluye esta columna.

alter table public.processes
  add column excepciones text[] not null default '{}';
