// Tipos de las tablas (mantener sincronizado con supabase/migrations/0001_schema.sql)
export type Role = "owner" | "viewer";
export type InterviewType = "encargado" | "trabajador";
export type InterviewStatus = "pendiente" | "agendada" | "realizada";
export type DataState = "estructurados" | "dispersos" | "en_papel" | "inexistentes";
export type MeasKind = "linea_base" | "posterior";
export type MeasMethod = "declarado" | "cronometrado" | "registro_sistema";
export type ProcessStage = "identificado" | "documentado" | "medido" | "puntuado" | "validado";
export type Decision = "automatizar" | "integrar_ia" | "no_tocar";
export type Phase = "quick_win" | "mediano_plazo" | "largo_plazo";
export type Priority = "alta" | "media" | "baja";
export type RmStatus = "pendiente" | "en_curso" | "hecho" | "descartado";
export type Activity =
  | "preparacion" | "traslado" | "reunion_inicio" | "entrevista" | "transcripcion_notas"
  | "medicion_tiempos" | "analisis" | "mapa_procesos" | "hoja_ruta" | "presentacion"
  | "comunicacion_cliente" | "desarrollo_interno" | "otro";

export type Client = {
  id: string; nombre: string; rut: string | null; rubro: string | null;
  rango_empleados: string | null; notas: string | null;
};
export type Area = { id: string; client_id: string; nombre: string; encargado_id: string | null };
export type Person = {
  id: string; client_id: string; area_id: string | null; nombre: string; cargo: string | null;
  email: string | null; telefono: string | null; es_encargado: boolean;
};
export type Interview = {
  id: string; client_id: string; area_id: string | null; person_id: string | null;
  tipo: InterviewType; fecha_hora: string | null; duracion_min: number | null;
  estado: InterviewStatus; resumen: string | null;
};
export type Sipoc = {
  proveedores: string[]; entradas: string[]; proceso: string[]; salidas: string[]; clientes: string[];
};
export type Process = {
  id: string; client_id: string; area_id: string; nombre: string; responsable: string | null;
  disparador: string | null; pasos: string[]; herramientas: string[]; problemas: string | null;
  estado_datos: DataState | null; sipoc: Sipoc; evidencia: string | null; estado_proceso: ProcessStage;
};
/** Lo que ve el viewer: sin responsable ni evidencia. */
export type ReportProcess = Omit<Process, "responsable" | "evidencia" | "estado_proceso">;
export type Measurement = {
  id: string; process_id: string; tipo: MeasKind; minutos_por_vez: number;
  veces_por_semana: number; personas: number; fecha: string; fuente?: string | null;
  metodo: MeasMethod; minutos_min: number | null; minutos_max: number | null;
};
export type Score = {
  process_id: string; frecuencia_volumen: number; tiempo: number; repetitivo_reglas: number;
  entradas_digitales: number; errores_retrabajo: number; quien_lo_asume: number; impacto: number;
  riesgo_legal: boolean; esfuerzo: number; decision: Decision | null;
};
export type RoadmapItem = {
  id: string; client_id: string; process_id: string | null; titulo: string; fase: Phase;
  prioridad: Priority; estado: RmStatus; esfuerzo_estimado: string | null; notas?: string | null;
  nivel_riesgo?: "bajo" | "medio" | "alto" | null;
};
export type DocumentRow = {
  id: string; client_id: string; area_id: string | null; nombre: string;
  ruta_storage: string; confidencial: boolean;
};
export type TimeLog = {
  id: string; fecha: string; client_id: string; actividad: Activity; minutos: number; detalle: string | null;
};

export type Freq = "diaria" | "semanal" | "mensual" | "otra";
/** Una tarea declarada en una entrevista (vínculo entrevista ↔ proceso). Solo dueño. */
export type InterviewTask = {
  process_id: string; nombre: string; area_id: string | null;
  frecuencia: Freq | null; quien_hace: string | null;
  pesa_tiempo: boolean; molesta_errores: boolean; nota: string | null; para_detalle: boolean;
};
export type TaskPatch = Partial<Pick<InterviewTask, "nombre" | "frecuencia" | "quien_hace" | "pesa_tiempo" | "molesta_errores" | "nota" | "para_detalle">>;
export type Opt = { id: string; nombre: string; area_id?: string | null };

export type StepType = "accion" | "decision" | "espera" | "sistema";
/** Paso del mapa de un proceso. Solo dueño. */
export type ProcessStep = {
  id: string; process_id: string; orden: number; texto: string; tipo: StepType;
  actor: string | null; herramienta: string | null; minutos_min: number | null; minutos_max: number | null;
  problema: boolean; nota: string | null;
};
export type StepPatch = Partial<Omit<ProcessStep, "id" | "process_id">>;
