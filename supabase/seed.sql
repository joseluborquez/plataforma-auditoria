-- seed.sql · Datos FICTICIOS del cliente "Ejemplo". Para borrarlos: delete from clients where nombre = 'Ejemplo';
do $$
declare
  c uuid := gen_random_uuid();
  a_rrhh uuid := gen_random_uuid();
  a_ops uuid := gen_random_uuid();
  a_mant uuid := gen_random_uuid();
  p_ana uuid := gen_random_uuid();
  p_luis uuid := gen_random_uuid();
  p_marta uuid := gen_random_uuid();
  i1 uuid := gen_random_uuid();
  pr1 uuid := gen_random_uuid();
  pr2 uuid := gen_random_uuid();
  pr3 uuid := gen_random_uuid();
begin
  if exists (select 1 from public.clients where nombre = 'Ejemplo') then return; end if;

  insert into public.clients (id, nombre, rut, rubro, rango_empleados, notas)
  values (c, 'Ejemplo', '11.111.111-1', 'Servicios marítimos (ficticio)', '50-100', 'Cliente ficticio para pruebas.');

  insert into public.areas (id, client_id, nombre) values
    (a_rrhh, c, 'RRHH'), (a_ops, c, 'Operaciones'), (a_mant, c, 'Mantención');
  insert into public.areas (client_id, nombre) values
    (c, 'Prevención de Riesgo'), (c, 'Administración y Abastecimiento'), (c, 'Robótica');

  insert into public.people (id, client_id, area_id, nombre, cargo, email, es_encargado) values
    (p_ana, c, a_rrhh, 'Ana Ejemplo', 'Jefa de RRHH', 'ana@ejemplo.test', true),
    (p_luis, c, a_ops, 'Luis Ejemplo', 'Jefe de Operaciones', 'luis@ejemplo.test', true),
    (p_marta, c, a_mant, 'Marta Ejemplo', 'Técnica de mantención', 'marta@ejemplo.test', false);
  update public.areas set encargado_id = p_ana where id = a_rrhh;
  update public.areas set encargado_id = p_luis where id = a_ops;

  insert into public.interviews (id, client_id, area_id, person_id, tipo, fecha_hora, duracion_min, estado, resumen) values
    (i1, c, a_rrhh, p_ana, 'encargado', now() - interval '3 days', 130, 'realizada', 'Resumen ficticio de la entrevista.'),
    (gen_random_uuid(), c, a_ops, p_luis, 'encargado', now() + interval '2 days', 120, 'agendada', null),
    (gen_random_uuid(), c, a_mant, p_marta, 'trabajador', null, null, 'pendiente', null);
  insert into public.interview_notes (interview_id, notas_privadas) values (i1, 'NOTA PRIVADA ficticia: no debe verla ningún viewer.');

  insert into public.processes (id, client_id, area_id, nombre, responsable, disparador, pasos, herramientas, problemas, estado_datos, sipoc, evidencia) values
    (pr1, c, a_rrhh, 'Liquidación de sueldos', 'Ana Ejemplo', 'Cierre de mes',
     '["Recopilar asistencia","Calcular horas extra","Emitir liquidaciones","Enviar por correo"]'::jsonb,
     array['Excel','Correo'], 'Cálculo manual con errores de digitación', 'dispersos',
     '{"proveedores":["Control de asistencia"],"entradas":["Planilla de asistencia"],"proceso":["Calcular","Emitir"],"salidas":["Liquidaciones"],"clientes":["Trabajadores"]}'::jsonb,
     'Evidencia privada ficticia'),
    (pr2, c, a_ops, 'Programación de turnos', 'Luis Ejemplo', 'Lunes',
     '["Revisar dotación","Armar turnos","Publicar"]'::jsonb, array['WhatsApp','Excel'],
     'Cambios de última hora por WhatsApp', 'dispersos',
     '{"proveedores":[],"entradas":[],"proceso":[],"salidas":[],"clientes":[]}'::jsonb, null),
    (pr3, c, a_mant, 'Solicitud de repuestos', 'Marta Ejemplo', 'Falla de equipo',
     '["Detectar falla","Cotizar","Aprobar","Comprar"]'::jsonb, array['Correo','Papel'],
     'Aprobaciones en papel', 'en_papel',
     '{"proveedores":[],"entradas":[],"proceso":[],"salidas":[],"clientes":[]}'::jsonb, null);

  insert into public.interview_processes (interview_id, process_id) values (i1, pr1);
  update public.processes set estado_proceso = 'puntuado' where id in (pr1, pr2, pr3);

  insert into public.time_measurements (process_id, tipo, minutos_por_vez, veces_por_semana, personas, fecha, fuente, metodo, minutos_min, minutos_max) values
    (pr1, 'linea_base', 240, 1, 2, current_date - 20, 'Fuente privada ficticia', 'declarado', 180, 300),
    (pr1, 'posterior', 60, 1, 1, current_date - 2, 'Prueba piloto', 'cronometrado', 50, 75),
    (pr2, 'linea_base', 90, 1, 1, current_date - 18, 'Cronometraje', 'cronometrado', null, null),
    (pr3, 'linea_base', 45, 6, 1, current_date - 15, 'Registro', 'declarado', 30, 60);

  insert into public.scores (process_id, frecuencia_volumen, tiempo, repetitivo_reglas, entradas_digitales, errores_retrabajo, quien_lo_asume, riesgo_legal, esfuerzo, decision) values
    (pr1, 4, 5, 5, 3, 4, 4, true, 3, 'automatizar'),
    (pr2, 3, 3, 4, 2, 3, 3, false, 2, 'automatizar'),
    (pr3, 4, 3, 3, 1, 3, 2, false, 4, 'integrar_ia');

  insert into public.roadmap_items (client_id, process_id, titulo, fase, prioridad, estado, esfuerzo_estimado, notas) values
    (c, pr1, 'Automatizar cálculo de liquidaciones', 'quick_win', 'alta', 'en_curso', '2 semanas', 'Nota interna ficticia'),
    (c, pr2, 'Planilla de turnos conectada a WhatsApp', 'mediano_plazo', 'media', 'pendiente', '3 semanas', null),
    (c, null, 'Capacitación general al equipo', 'largo_plazo', 'baja', 'pendiente', '1 semana', null);

  insert into public.risk_reviews (roadmap_item_id, datos_personales, decide_sobre_personas, supervision_humana, registro_trazabilidad, datos_salen_del_pais, plan_reversa, responsable_definido, responsable_cliente, controles, nivel, notas)
  select id, true, true, true, false, false, true, true, 'Jefatura de RRHH (ficticio)',
         '{"exactitud": true, "autorizacion": true, "excepciones": false, "cambios": false, "credenciales": true, "continuidad": false}'::jsonb,
         'medio', 'Revisión de ejemplo (ficticia).'
  from public.roadmap_items where client_id = c and titulo = 'Automatizar cálculo de liquidaciones';

  insert into public.documents (client_id, area_id, nombre, ruta_storage, confidencial) values
    (c, a_rrhh, 'Mapa de procesos RRHH (ficticio)', c::text || '/ejemplo-mapa.pdf', false),
    (c, null, 'Contrato (ficticio, confidencial)', c::text || '/ejemplo-contrato.pdf', true);

  insert into public.time_log (fecha, client_id, actividad, minutos, detalle) values
    (current_date - 10, c, 'preparacion', 90, 'Preparación inicial'),
    (current_date - 8, c, 'traslado', 120, 'Viaje a Castro'),
    (current_date - 8, c, 'entrevista', 130, 'Entrevista RRHH'),
    (current_date - 7, c, 'transcripcion_notas', 60, null),
    (current_date - 5, c, 'analisis', 180, 'Análisis de procesos');
end $$;
