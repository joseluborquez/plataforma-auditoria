import type { Activity, DataState, Decision, InterviewStatus, InterviewType, MeasKind, MeasMethod, Phase, Priority, ProcessStage, RmStatus } from "./types";

export const INTERVIEW_TYPE: Record<InterviewType, string> = { encargado: "Encargado", trabajador: "Trabajador" };
export const INTERVIEW_STATUS: Record<InterviewStatus, string> = { pendiente: "Pendiente", agendada: "Agendada", realizada: "Realizada" };
export const DATA_STATE: Record<DataState, string> = {
  estructurados: "Datos estructurados", dispersos: "Datos dispersos", en_papel: "En papel", inexistentes: "Sin datos",
};
export const MEAS_KIND: Record<MeasKind, string> = { linea_base: "Línea base", posterior: "Posterior" };
export const MEAS_METHOD: Record<MeasMethod, string> = {
  declarado: "Declarado en entrevista", cronometrado: "Cronometrado", registro_sistema: "Registro del sistema",
};
export const PROCESS_STAGE: Record<ProcessStage, string> = {
  identificado: "Identificado", documentado: "Documentado", medido: "Medido", puntuado: "Puntuado", validado: "Validado",
};
export const DECISION: Record<Decision, string> = { automatizar: "Automatizar", integrar_ia: "Integrar IA", no_tocar: "No tocar" };
export const PHASE: Record<Phase, string> = { quick_win: "Quick win", mediano_plazo: "Mediano plazo", largo_plazo: "Largo plazo" };
export const PRIORITY: Record<Priority, string> = { alta: "Alta", media: "Media", baja: "Baja" };
export const RM_STATUS: Record<RmStatus, string> = { pendiente: "Pendiente", en_curso: "En curso", hecho: "Hecho", descartado: "Descartado" };
export const ACTIVITY: Record<Activity, string> = {
  preparacion: "Preparación", traslado: "Traslado", reunion_inicio: "Reunión de inicio", entrevista: "Entrevista",
  transcripcion_notas: "Transcripción y notas", medicion_tiempos: "Medición de tiempos", analisis: "Análisis",
  mapa_procesos: "Mapa de procesos", hoja_ruta: "Hoja de ruta", presentacion: "Presentación",
  comunicacion_cliente: "Comunicación con cliente", desarrollo_interno: "Desarrollo interno", otro: "Otro",
};
export const CRITERIA = [
  ["frecuencia_volumen", "Frecuencia / volumen"],
  ["tiempo", "Tiempo que consume"],
  ["repetitivo_reglas", "Repetitivo y con reglas"],
  ["entradas_digitales", "Entradas digitales"],
  ["errores_retrabajo", "Errores / retrabajo"],
  ["quien_lo_asume", "Quién lo asume (carga)"],
] as const;

export const FREQ: Record<"diaria" | "semanal" | "mensual" | "otra", string> = {
  diaria: "Cada día", semanal: "Cada semana", mensual: "Cada mes", otra: "Otra",
};
