-- 0002_rls_helpers.sql · Funciones auxiliares para RLS
-- security definer + search_path vacío: leen profiles/viewers sin disparar RLS recursivo.

create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role = 'owner'
  )
$$;

create function public.viewer_sees_client(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.viewers v
    where v.user_id = (select auth.uid()) and v.client_id = c
  )
$$;

-- Alcance por área: area_id NULL en viewers = global. Si `a` es NULL, solo alcance global.
create function public.viewer_sees_area(c uuid, a uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.viewers v
    where v.user_id = (select auth.uid())
      and v.client_id = c
      and (v.area_id is null or v.area_id = a)
  )
$$;

create function public.viewer_sees_process(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.processes pr
    where pr.id = p and public.viewer_sees_area(pr.client_id, pr.area_id)
  )
$$;

-- Ítem de hoja de ruta: con proceso, según el área del proceso; sin proceso, solo alcance global.
create function public.viewer_sees_roadmap(c uuid, p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p is null then public.viewer_sees_area(c, null)
    else public.viewer_sees_process(p)
  end
$$;

-- Las funciones no se exponen al rol anónimo.
revoke execute on function public.is_owner() from public, anon;
revoke execute on function public.viewer_sees_client(uuid) from public, anon;
revoke execute on function public.viewer_sees_area(uuid, uuid) from public, anon;
revoke execute on function public.viewer_sees_process(uuid) from public, anon;
revoke execute on function public.viewer_sees_roadmap(uuid, uuid) from public, anon;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.viewer_sees_client(uuid) to authenticated;
grant execute on function public.viewer_sees_area(uuid, uuid) to authenticated;
grant execute on function public.viewer_sees_process(uuid) to authenticated;
grant execute on function public.viewer_sees_roadmap(uuid, uuid) to authenticated;
