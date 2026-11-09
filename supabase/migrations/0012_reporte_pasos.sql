-- 0012_reporte_pasos.sql · Pasos del proceso para el reporte del cliente (viewer)
--  · Sin notas de los pasos.
--  · Sin nombres de personas: cada persona del proceso pasa a «Persona 1», «Persona 2»… (por orden de aparición).
--    «Sistema», «Cliente» y «Proveedor» son roles, no personas, y se conservan.
--  · Mismo criterio de alcance que report_measurements: dueño ve todo; viewer solo lo que su alcance permite.

create view public.report_process_steps with (security_invoker = false) as
  with base as (
    select s.id, s.process_id, s.orden, s.texto, s.tipo, s.herramienta, s.minutos_min, s.minutos_max, s.problema,
           nullif(btrim(s.actor), '') as actor_clean
    from public.process_steps s
    where (select public.is_owner()) or public.viewer_sees_process(s.process_id)
  ),
  personas as (
    select process_id, actor_clean,
           dense_rank() over (partition by process_id order by first_orden, actor_clean) as n
    from (
      select process_id, actor_clean, min(orden) as first_orden
      from base
      where actor_clean is not null and lower(actor_clean) not in ('sistema', 'cliente', 'proveedor')
      group by process_id, actor_clean
    ) f
  )
  select b.id, b.process_id, b.orden, b.texto, b.tipo, b.herramienta, b.minutos_min, b.minutos_max, b.problema,
         case
           when b.actor_clean is null then null
           when lower(b.actor_clean) in ('sistema', 'cliente', 'proveedor') then initcap(lower(b.actor_clean))
           else 'Persona ' || p.n::text
         end as actor
  from base b
  left join personas p on p.process_id = b.process_id and p.actor_clean = b.actor_clean;

revoke all on public.report_process_steps from public, anon;
grant select on public.report_process_steps to authenticated;
