-- rls.test.sql · Pruebas de las políticas RLS. Todo corre dentro de una transacción que termina en ROLLBACK.
-- Ejecutar como rol postgres (psql -f, SQL editor o MCP). Si una aserción falla, lanza una excepción.
-- No deja datos: crea usuarios, clientes y filas de prueba y los revierte.

begin;

-- ── Datos de prueba ──
insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-global-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-area-a1@test.local'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-b@test.local'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sin-alcance@test.local');
update public.profiles set role = 'owner' where user_id = '00000000-0000-0000-0000-0000000000a1';

insert into public.clients (id, nombre, rut, notas) values
  ('c0000000-0000-0000-0000-00000000000a', 'Cliente A', '1-9', 'NOTAS PRIVADAS A'),
  ('c0000000-0000-0000-0000-00000000000b', 'Cliente B', '2-7', 'NOTAS PRIVADAS B');
insert into public.areas (id, client_id, nombre) values
  ('a0000000-0000-0000-0000-0000000000a1', 'c0000000-0000-0000-0000-00000000000a', 'A1'),
  ('a0000000-0000-0000-0000-0000000000a2', 'c0000000-0000-0000-0000-00000000000a', 'A2'),
  ('a0000000-0000-0000-0000-0000000000b1', 'c0000000-0000-0000-0000-00000000000b', 'B1');
insert into public.people (id, client_id, area_id, nombre) values
  ('90000000-0000-0000-0000-0000000000a1', 'c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-0000000000a1', 'Persona A1');
insert into public.interviews (id, client_id, area_id, person_id, tipo) values
  ('10000000-0000-0000-0000-0000000000a1', 'c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-0000000000a1', '90000000-0000-0000-0000-0000000000a1', 'encargado');
insert into public.interview_notes (interview_id, notas_privadas) values
  ('10000000-0000-0000-0000-0000000000a1', 'PRIVADO');
insert into public.processes (id, client_id, area_id, nombre, responsable, evidencia) values
  ('20000000-0000-0000-0000-0000000000a1', 'c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-0000000000a1', 'Proceso A1', 'Resp A1', 'Evid A1'),
  ('20000000-0000-0000-0000-0000000000a2', 'c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-0000000000a2', 'Proceso A2', 'Resp A2', 'Evid A2'),
  ('20000000-0000-0000-0000-0000000000b1', 'c0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-0000000000b1', 'Proceso B1', 'Resp B1', 'Evid B1');
insert into public.interview_processes (interview_id, process_id) values
  ('10000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1');
insert into public.time_measurements (process_id, tipo, minutos_por_vez, veces_por_semana, fecha, fuente) values
  ('20000000-0000-0000-0000-0000000000a1', 'linea_base', 60, 1, current_date, 'fuente a1'),
  ('20000000-0000-0000-0000-0000000000a2', 'linea_base', 30, 1, current_date, 'fuente a2'),
  ('20000000-0000-0000-0000-0000000000b1', 'linea_base', 10, 1, current_date, 'fuente b1');
insert into public.scores (process_id, frecuencia_volumen, tiempo, repetitivo_reglas, entradas_digitales, errores_retrabajo, quien_lo_asume, esfuerzo) values
  ('20000000-0000-0000-0000-0000000000a1', 3,3,3,3,3,3, 2),
  ('20000000-0000-0000-0000-0000000000b1', 3,3,3,3,3,3, 2);
insert into public.roadmap_items (client_id, process_id, titulo, fase, prioridad, notas) values
  ('c0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'RM A1', 'quick_win', 'alta', 'nota rm'),
  ('c0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a2', 'RM A2', 'quick_win', 'alta', null),
  ('c0000000-0000-0000-0000-00000000000a', null, 'RM A general', 'quick_win', 'alta', null),
  ('c0000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-0000000000b1', 'RM B1', 'quick_win', 'alta', null);
insert into public.documents (client_id, area_id, nombre, ruta_storage, confidencial) values
  ('c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-0000000000a1', 'Doc público A1', 'ta/pub.pdf', false),
  ('c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-0000000000a1', 'Doc confidencial A1', 'ta/conf.pdf', true),
  ('c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-0000000000a2', 'Doc público A2', 'ta/pub2.pdf', false),
  ('c0000000-0000-0000-0000-00000000000b', null, 'Doc público B', 'tb/pub.pdf', false);
insert into public.time_log (client_id, actividad, minutos) values
  ('c0000000-0000-0000-0000-00000000000a', 'entrevista', 120);
insert into public.viewers (user_id, client_id, area_id) values
  ('00000000-0000-0000-0000-0000000000b1', 'c0000000-0000-0000-0000-00000000000a', null),
  ('00000000-0000-0000-0000-0000000000b2', 'c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b3', 'c0000000-0000-0000-0000-00000000000b', null);

-- Helpers de prueba
create function pg_temp.act_as(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.expect(label text, actual bigint, expected bigint) returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FALLO [%]: esperado %, obtenido %', label, expected, actual;
  end if;
end $$;

create function pg_temp.expect_denied(label text, stmt text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when insufficient_privilege or others then
    return;  -- bloqueado: OK
  end;
  raise exception 'FALLO [%]: la operación debió ser rechazada', label;
end $$;
grant execute on all functions in schema pg_temp to public;

-- ═════════ DUEÑO: ve todo ═════════
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('owner ve clients', (select count(*) from public.clients where nombre in ('Cliente A','Cliente B')), 2);
select pg_temp.expect('owner ve interview_notes', (select count(*) from public.interview_notes where notas_privadas = 'PRIVADO'), 1);
select pg_temp.expect('owner ve time_log', (select count(*) from public.time_log where client_id = 'c0000000-0000-0000-0000-00000000000a'), 1);
reset role;

-- ═════════ VIEWER GLOBAL del cliente A ═════════
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('viewer: 0 interview_notes', (select count(*) from public.interview_notes), 0);
select pg_temp.expect('viewer: 0 time_log', (select count(*) from public.time_log), 0);
select pg_temp.expect('viewer: 0 interviews', (select count(*) from public.interviews), 0);
select pg_temp.expect('viewer: 0 people', (select count(*) from public.people), 0);
select pg_temp.expect('viewer: 0 processes (tabla base)', (select count(*) from public.processes), 0);
select pg_temp.expect('viewer: 0 clients (tabla base)', (select count(*) from public.clients), 0);
select pg_temp.expect('viewer: 0 time_measurements (tabla base)', (select count(*) from public.time_measurements), 0);
select pg_temp.expect('viewer: 0 roadmap_items (tabla base)', (select count(*) from public.roadmap_items), 0);
select pg_temp.expect('viewer: 0 interview_processes (no sabe qué entrevista originó qué)', (select count(*) from public.interview_processes), 0);
select pg_temp.expect('viewer ve método de medición', (select count(*) from public.report_measurements where metodo = 'declarado'), 2);
select pg_temp.expect_denied('viewer no vincula entrevistas', $q$insert into public.interview_processes (interview_id, process_id) values ('10000000-0000-0000-0000-0000000000a1','20000000-0000-0000-0000-0000000000a2')$q$);
select pg_temp.expect('viewer: 0 profiles ajenos', (select count(*) from public.profiles where role = 'owner'), 0);
select pg_temp.expect('viewer ve su cliente', (select count(*) from public.report_clients), 1);
select pg_temp.expect('viewer no ve cliente B', (select count(*) from public.report_clients where nombre = 'Cliente B'), 0);
select pg_temp.expect('viewer ve procesos A1+A2', (select count(*) from public.report_processes), 2);
select pg_temp.expect('viewer no ve proceso de B', (select count(*) from public.report_processes where nombre = 'Proceso B1'), 0);
select pg_temp.expect('viewer ve mediciones A', (select count(*) from public.report_measurements), 2);
select pg_temp.expect('viewer ve roadmap A (3 ítems, global incluye general)', (select count(*) from public.report_roadmap), 3);
select pg_temp.expect('viewer ve puntuación A', (select count(*) from public.scores), 1);
select pg_temp.expect('viewer ve 2 áreas de A', (select count(*) from public.areas), 2);
select pg_temp.expect('viewer ve solo docs públicos de A (2)', (select count(*) from public.documents), 2);
select pg_temp.expect('viewer no ve confidenciales', (select count(*) from public.documents where confidencial), 0);
-- Las vistas no exponen columnas privadas
select pg_temp.expect_denied('vista sin responsable', 'select responsable from public.report_processes');
select pg_temp.expect_denied('vista sin evidencia', 'select evidencia from public.report_processes');
select pg_temp.expect_denied('vista sin fuente', 'select fuente from public.report_measurements');
select pg_temp.expect_denied('vista sin notas roadmap', 'select notas from public.report_roadmap');
select pg_temp.expect_denied('vista sin rut', 'select rut from public.report_clients');
-- Solo lectura
select pg_temp.expect_denied('viewer no inserta', $q$insert into public.clients (nombre) values ('x')$q$);
select pg_temp.expect_denied('viewer no escribe notas', $q$insert into public.interview_notes (interview_id, notas_privadas) values ('10000000-0000-0000-0000-0000000000a1','x')$q$);
select pg_temp.expect_denied('viewer no escribe horas', $q$insert into public.time_log (client_id, actividad, minutos) values ('c0000000-0000-0000-0000-00000000000a','otro',5)$q$);
update public.profiles set role = 'owner';  -- sin política de UPDATE: afecta 0 filas (se verifica abajo)
select pg_temp.expect_denied('viewer no se da alcance', $q$insert into public.viewers (user_id, client_id) values ('00000000-0000-0000-0000-0000000000b1','c0000000-0000-0000-0000-00000000000b')$q$);
-- UPDATE/DELETE no afectan filas (RLS las oculta)
update public.areas set nombre = 'hack'; delete from public.documents;
reset role;
select pg_temp.expect('viewer no se promueve a owner', (select count(*) from public.profiles where role = 'owner' and user_id::text like '00000000-0000-0000-0000-0000000000b%'), 0);
select pg_temp.expect('areas intactas', (select count(*) from public.areas where nombre = 'hack'), 0);
select pg_temp.expect('docs intactos', (select count(*) from public.documents where ruta_storage in ('ta/pub.pdf','ta/conf.pdf','ta/pub2.pdf','tb/pub.pdf')), 4);

-- ═════════ VIEWER DE ÁREA A1 ═════════
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select pg_temp.expect('área: ve solo proceso A1', (select count(*) from public.report_processes), 1);
select pg_temp.expect('área: no ve proceso A2', (select count(*) from public.report_processes where nombre = 'Proceso A2'), 0);
select pg_temp.expect('área: roadmap solo de A1 (sin general ni A2)', (select count(*) from public.report_roadmap), 1);
select pg_temp.expect('área: mediciones solo A1', (select count(*) from public.report_measurements), 1);
select pg_temp.expect('área: 1 área', (select count(*) from public.areas), 1);
select pg_temp.expect('área: doc público A1 solamente', (select count(*) from public.documents), 1);
reset role;

-- ═════════ VIEWER DEL CLIENTE B: no ve datos de A ═════════
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b3');
select pg_temp.expect('B no ve proceso de A', (select count(*) from public.report_processes where nombre like 'Proceso A%'), 0);
select pg_temp.expect('B ve su proceso', (select count(*) from public.report_processes), 1);
select pg_temp.expect('B no ve scores de A', (select count(*) from public.scores where process_id = '20000000-0000-0000-0000-0000000000a1'), 0);
select pg_temp.expect('B no ve docs de A', (select count(*) from public.documents where nombre like '%A%' and client_id = 'c0000000-0000-0000-0000-00000000000a'), 0);
reset role;

-- ═════════ USUARIO SIN ALCANCE ═════════
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b4');
select pg_temp.expect('sin alcance: 0 clientes', (select count(*) from public.report_clients), 0);
select pg_temp.expect('sin alcance: 0 procesos', (select count(*) from public.report_processes), 0);
select pg_temp.expect('sin alcance: 0 docs', (select count(*) from public.documents), 0);
reset role;

-- ═════════ ANÓNIMO ═════════
set local role anon;
select pg_temp.expect_denied('anon no lee clients', 'select * from public.clients');
select pg_temp.expect_denied('anon no lee vista', 'select * from public.report_processes');
select pg_temp.expect_denied('anon no lee notas', 'select * from public.interview_notes');
select pg_temp.expect_denied('anon no lee vínculos', 'select * from public.interview_processes');
reset role;

-- ═════════ RLS activa en todas las tablas de public ═════════
select pg_temp.expect('todas las tablas con RLS',
  (select count(*) from pg_tables t join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace
   where t.schemaname = 'public' and not c.relrowsecurity), 0);

select 'RLS OK: todas las pruebas pasaron' as resultado;
rollback;
