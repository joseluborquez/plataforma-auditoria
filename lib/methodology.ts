// Texto de alcance, método y limitaciones que se imprime en el reporte. Editable.
// Marcos de referencia: se declara alineación, NO certificación.

export const AUDITOR = "JLB Systems SpA";

export type MethodSection = { titulo: string; items: string[] };

export function methodology(cliente: string): MethodSection[] {
  return [
    {
      titulo: "Alcance",
      items: [
        `Diagnóstico de procesos de ${cliente}, orientado a identificar tareas que se pueden automatizar o mejorar con tecnología e inteligencia artificial.`,
        "Se basa en entrevistas con encargados y trabajadores, observación de tareas y mediciones de tiempo.",
        "No es una auditoría financiera, ni de cumplimiento legal, ni un servicio de aseguramiento bajo estándares de auditoría interna o externa.",
      ],
    },
    {
      titulo: "Método",
      items: [
        "Levantamiento: entrevistas de dos tipos (encargado de área y trabajador) con un guion común.",
        "Mapa de cada proceso con el modelo SIPOC (proveedores, entradas, proceso, salidas, clientes).",
        "Medición de tiempos, registrando si el dato fue declarado, cronometrado o tomado de un sistema.",
        "Puntuación de automatizabilidad con seis criterios de 1 a 5 (impacto de 6 a 30) y esfuerzo de 1 a 5, con una rúbrica común.",
        "Revisión de riesgo de cada ítem de la hoja de ruta (datos personales, decisiones sobre personas, supervisión humana, trazabilidad, transferencia de datos, plan de reversa y responsable).",
        "Hoja de ruta priorizada por impacto y esfuerzo.",
      ],
    },
    {
      titulo: "Evidencia y confiabilidad",
      items: [
        "Los tiempos declarados en entrevista son estimaciones; los cronometrados o de sistema tienen mayor respaldo. Cada comparación indica cuál es el caso.",
        "Los procesos se contrastan con el encargado del área antes de considerarse validados.",
        "Las declaraciones de las personas son confidenciales: el informe presenta hallazgos por proceso, sin atribuirlos a nadie.",
      ],
    },
    {
      titulo: "Marcos de referencia",
      items: [
        "La revisión de riesgo se alinea con las funciones del Marco de Gestión de Riesgos de IA del NIST (AI RMF 1.0: gobernar, mapear, medir y gestionar) y con la guía ISO/IEC 23894.",
        "Los controles de las automatizaciones se inspiran en prácticas de seguridad de la información de ISO/IEC 27001.",
        "Se declara alineación con estos marcos como referencia; no constituye una certificación ni una evaluación de conformidad.",
      ],
    },
    {
      titulo: "Independencia y conflicto de interés",
      items: [
        `${AUDITOR} puede ser contratada para implementar y capacitar las mejoras que este diagnóstico recomienda. Esta relación se declara para que las recomendaciones se evalúen con ese conocimiento.`,
        "Se recomienda comparar alternativas y proveedores antes de decidir cada implementación.",
      ],
    },
    {
      titulo: "Limitaciones",
      items: [
        "Los resultados reflejan la información disponible durante el período de levantamiento y las personas entrevistadas.",
        "La revisión de riesgo es un tamizaje de apoyo a la decisión; no reemplaza una evaluación legal o técnica formal.",
        "Las obligaciones legales (por ejemplo, protección de datos personales) deben validarse con asesoría legal.",
      ],
    },
  ];
}
