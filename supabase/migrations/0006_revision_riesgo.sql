-- 0006_revision_riesgo.sql · Revisión de riesgo y controles por ítem de la hoja de ruta
-- Detalle (responsable, notas, respuestas) solo para el dueño. El viewer ve únicamente el nivel (bajo/medio/alto).

create type public.risk_level as enum ('bajo', 'medio', 'alto');

create table public.risk_reviews (
  roadmap_item_id uuid primary key references public.roadmap_items on delete cascade,
  datos_personales boolean not null default false,       -- sí = riesgo
  decide_sobre_personas boolean not null default false,  -- sí = riesgo
  supervision_humana boolean not null default false,     -- sí = control presente
  registro_trazabilidad boolean not null default false,  -- sí = control presente
  datos_salen_del_pais boolean not null default false,   -- sí = riesgo
  plan_reversa boolean not null default false,           -- sí = control presente
  responsable_definido boolean not null default false,   -- sí = control presente
  responsable_cliente text,
  controles jsonb not null default '{}'::jsonb,          -- {clave: true/false} de la ficha de controles
  nivel public.risk_level not null default 'bajo',       -- calculado en la app al guardar
  notas text,
  revisado_en timestamptz not null default now()
);

alter table public.risk_reviews enable row level security;
alter table public.risk_reviews force row level security;
create policy owner_all on public.risk_reviews for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.risk_reviews from anon;

-- El viewer ve el nivel de riesgo del ítem, nunca las respuestas, el responsable ni las notas.
create or replace view public.report_roadmap with (security_invoker = false) as
  select r.id, r.client_id, r.process_id, r.titulo, r.fase, r.prioridad, r.estado, r.esfuerzo_estimado,
         rr.nivel as nivel_riesgo
  from public.roadmap_items r
  left join public.risk_reviews rr on rr.roadmap_item_id = r.id
  where (select public.is_owner()) or public.viewer_sees_roadmap(r.client_id, r.process_id);
