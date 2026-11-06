// Revisión de riesgo de automatización / IA por ítem de la hoja de ruta.
// Alineada con las funciones de NIST AI RMF 1.0 (Govern, Map, Measure, Manage) y la guía ISO/IEC 23894.
// Es un tamizaje de apoyo a la decisión: NO reemplaza una evaluación legal ni técnica formal.

export type RiskLevel = "bajo" | "medio" | "alto";

export type RiskAnswers = {
  datos_personales: boolean;
  decide_sobre_personas: boolean;
  supervision_humana: boolean;
  registro_trazabilidad: boolean;
  datos_salen_del_pais: boolean;
  plan_reversa: boolean;
  responsable_definido: boolean;
};

export const RISK_QUESTIONS: { key: keyof RiskAnswers; pregunta: string; ayuda: string; sinoEs: "riesgo" | "control" }[] = [
  { key: "datos_personales", pregunta: "¿Toca datos personales?", sinoEs: "riesgo",
    ayuda: "Nombres, RUT, sueldos, salud, ubicación, correos de personas." },
  { key: "decide_sobre_personas", pregunta: "¿Decide o influye en decisiones sobre personas?", sinoEs: "riesgo",
    ayuda: "Contratación, evaluación, sueldos, turnos, sanciones, accesos." },
  { key: "supervision_humana", pregunta: "¿Una persona revisa o aprueba el resultado antes de que tenga efecto?", sinoEs: "control",
    ayuda: "Supervisión humana efectiva, con poder de corregir o frenar." },
  { key: "registro_trazabilidad", pregunta: "¿Queda registro de lo que hace (quién, cuándo, qué cambió)?", sinoEs: "control",
    ayuda: "Bitácora que permita reconstruir y explicar una decisión o un error." },
  { key: "datos_salen_del_pais", pregunta: "¿Los datos salen del país o los procesa un tercero en el extranjero?", sinoEs: "riesgo",
    ayuda: "Servicios en la nube, modelos de IA externos, proveedores de otros países." },
  { key: "plan_reversa", pregunta: "¿Existe un plan para volver al proceso manual si falla?", sinoEs: "control",
    ayuda: "Respaldo, procedimiento alternativo y persona que sepa operarlo." },
  { key: "responsable_definido", pregunta: "¿Hay un responsable nombrado en el cliente?", sinoEs: "control",
    ayuda: "Alguien que responde por el funcionamiento y por los resultados." },
];

export const CONTROLS = [
  { key: "exactitud", label: "Exactitud y completitud", ayuda: "Validaciones o cuadraturas que detectan datos faltantes o mal calculados." },
  { key: "autorizacion", label: "Autorización", ayuda: "Solo personas autorizadas ejecutan, aprueban o cambian la automatización." },
  { key: "excepciones", label: "Manejo de excepciones", ayuda: "Los casos raros o con error se derivan a una persona, no se pierden." },
  { key: "cambios", label: "Control de cambios", ayuda: "Los cambios se prueban, se registran y se pueden revertir." },
  { key: "credenciales", label: "Credenciales y accesos", ayuda: "Claves guardadas de forma segura, con mínimo privilegio y revisión periódica." },
  { key: "continuidad", label: "Continuidad", ayuda: "Respaldos, monitoreo y alguien que se entera cuando algo se detiene." },
] as const;

export function assessRisk(a: RiskAnswers, usaIA = false): { nivel: RiskLevel; puntaje: number; acciones: string[] } {
  let puntaje = 0;
  const acciones: string[] = [];
  if (a.datos_personales) { puntaje += 1; acciones.push("Minimizar los datos personales usados y definir cuánto tiempo se guardan (revisar Ley 21.719 con asesor legal)."); }
  if (a.decide_sobre_personas) { puntaje += 2; acciones.push("Tratarlo como caso sensible: no automatizar la decisión final sobre personas; explicar los criterios."); }
  if (!a.supervision_humana) { puntaje += 1; acciones.push("Agregar una revisión humana antes de que el resultado tenga efecto."); }
  if (!a.registro_trazabilidad) { puntaje += 1; acciones.push("Registrar cada ejecución para poder reconstruir y explicar lo ocurrido."); }
  if (a.datos_salen_del_pais) { puntaje += 1; acciones.push("Evaluar con asesor legal la transferencia de datos al extranjero y el contrato con el proveedor."); }
  if (!a.plan_reversa) { puntaje += 1; acciones.push("Definir un plan de reversa al proceso manual y probarlo."); }
  if (!a.responsable_definido) { puntaje += 1; acciones.push("Nombrar un responsable en el cliente antes de implementar."); }
  if (usaIA) { puntaje += 1; acciones.push("Por usar IA: medir la calidad de sus resultados y revisarla periódicamente."); }

  const critico = a.decide_sobre_personas && !a.supervision_humana;
  const nivel: RiskLevel = critico || puntaje >= 6 ? "alto" : puntaje >= 3 ? "medio" : "bajo";
  return { nivel, puntaje, acciones };
}

export function controlsDone(controles: Record<string, boolean> | null | undefined): number {
  return CONTROLS.filter((c) => controles?.[c.key]).length;
}
