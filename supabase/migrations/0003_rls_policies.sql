-- 0003_rls_policies.sql · RLS en TODAS las tablas + vistas de reporte para el viewer
--
-- Modelo:
--  · owner  → acceso total (política owner_all en cada tabla).
--  · viewer → solo lectura, y SOLO de lo que su fila en `viewers` permite.
--  · El viewer no tiene ninguna política sobre: clients, people, interviews, interview_notes,
--    processes, time_measurements, roadmap_items, time_log. Esos datos los lee únicamente por
--    las vistas report_*, que omiten columnas privadas (rut, notas, responsable, evidencia, fuente).
--  · anon no tiene acceso a nada.

-- Privilegios: anon fuera; authenticated pasa por RLS.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','clients','areas','people','interviews','interview_notes','processes',
    'time_measurements','scores','roadmap_items','documents','time_log','viewers'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format(
      'create policy owner_all on public.%I for all to authenticated
         using ((select public.is_owner())) with check ((select public.is_owner()))', t);
  end loop;
end $$;

-- Lecturas del viewer (solo SELECT)
create policy self_read on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy viewer_read on public.viewers for select to authenticated
  using (user_id = (select auth.uid()));

create policy viewer_read on public.areas for select to authenticated
  using (public.viewer_sees_area(client_id, id));

create policy viewer_read on public.scores for select to authenticated
  using (public.viewer_sees_process(process_id));

create policy viewer_read on public.documents for select to authenticated
  using (not confidencial and public.viewer_sees_area(client_id, area_id));

-- ───────────── Vistas de reporte (columnas seguras) ─────────────
-- Corren con los privilegios del dueño de la vista (omiten RLS) y filtran por alcance con auth.uid().
-- El dueño también puede consultarlas (vista previa del reporte).

create view public.report_clients with (security_invoker = false) as
  select c.id, c.nombre, c.rubro, c.rango_empleados
  from public.clients c
  where (select public.is_owner()) or public.viewer_sees_client(c.id);

create view public.report_processes with (security_invoker = false) as
  select p.id, p.client_id, p.area_id, p.nombre, p.disparador, p.pasos, p.herramientas,
         p.problemas, p.estado_datos, p.sipoc
  from public.processes p
  where (select public.is_owner()) or public.viewer_sees_area(p.client_id, p.area_id);

create view public.report_measurements with (security_invoker = false) as
  select m.id, m.process_id, m.tipo, m.minutos_por_vez, m.veces_por_semana, m.personas, m.fecha
  from public.time_measurements m
  where (select public.is_owner()) or public.viewer_sees_process(m.process_id);

create view public.report_roadmap with (security_invoker = false) as
  select r.id, r.client_id, r.process_id, r.titulo, r.fase, r.prioridad, r.estado, r.esfuerzo_estimado
  from public.roadmap_items r
  where (select public.is_owner()) or public.viewer_sees_roadmap(r.client_id, r.process_id);

revoke all on public.report_clients, public.report_processes,
              public.report_measurements, public.report_roadmap from public, anon;
grant select on public.report_clients, public.report_processes,
                public.report_measurements, public.report_roadmap to authenticated;
