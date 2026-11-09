-- 0009_inventario_entrevista.sql · Inventario rápido de tareas dentro de la entrevista
--  Lo que se declara de cada tarea queda en el vínculo entrevista ↔ proceso (no en el proceso),
--  porque el encargado y el trabajador pueden ver la misma tarea de forma distinta.
--  interview_processes ya es solo del dueño (RLS forzado): el viewer no ve nada de esto.

alter table public.interview_processes
  add column frecuencia text check (frecuencia is null or frecuencia in ('diaria', 'semanal', 'mensual', 'otra')),
  add column quien_hace text,
  add column pesa_tiempo boolean not null default false,
  add column molesta_errores boolean not null default false,
  add column nota text,
  add column para_detalle boolean not null default false,
  add column created_at timestamptz not null default now();
