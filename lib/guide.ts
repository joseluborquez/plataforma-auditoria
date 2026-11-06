// Guion base de entrevistas (Cono Austral SpA y similares). Editable: es solo contenido.
// `campo` indica a qué campo de la ficha del proceso alimenta la respuesta.

export type GuideQuestion = { texto: string; campo?: string; sondeo?: string };
export type GuideSection = { titulo: string; minutos: number; objetivo: string; preguntas: GuideQuestion[] };
export type Guide = { titulo: string; resumen: string; secciones: GuideSection[] };

const APERTURA_ENCARGADO: GuideSection = {
  titulo: "1. Apertura y acuerdos", minutos: 10,
  objetivo: "Generar confianza y dejar claras las reglas: para qué sirve, qué se hace con lo conversado y qué no se atribuye a nadie.",
  preguntas: [
    { texto: "Explicar el objetivo: entender cómo se trabaja hoy para encontrar tareas que se puedan automatizar o mejorar. No es una evaluación de personas." },
    { texto: "Acordar la confidencialidad: el informe para la gerencia muestra hallazgos por proceso, nunca quién dijo qué.", campo: "Notas privadas" },
    { texto: "Pedir permiso para tomar notas (y, si corresponde, grabar audio solo para uso interno)." },
    { texto: "¿Hay algo que prefiera que no quede registrado?" },
  ],
};

export const GUIDES: Record<"encargado" | "trabajador", Guide> = {
  encargado: {
    titulo: "Entrevista a encargado de área",
    resumen: "Visión del área, inventario de tareas recurrentes y detalle de 2 a 3 procesos clave. Duración sugerida: 120 minutos.",
    secciones: [
      APERTURA_ENCARGADO,
      {
        titulo: "2. Contexto del área", minutos: 15,
        objetivo: "Entender qué hace el área, con quién trabaja y cómo cambia durante el año.",
        preguntas: [
          { texto: "¿Cuál es la función del área y a quién le entrega resultados (dentro y fuera de la empresa)?" },
          { texto: "¿Cuántas personas trabajan en el área y en qué cargos? ¿Hay turnos o trabajo en terreno o en centros?" },
          { texto: "¿Hay temporadas o picos de trabajo? ¿Qué cambia en esos períodos?", sondeo: "Cierres de mes, contratos, temporadas productivas, auditorías externas." },
          { texto: "¿Qué indicadores o reportes revisa usted para saber si el área va bien?" },
        ],
      },
      {
        titulo: "3. Inventario de tareas recurrentes", minutos: 25,
        objetivo: "Listar TODO lo que se repite, sin profundizar todavía. Luego elegir 2 o 3 para detallar.",
        preguntas: [
          { texto: "Pensemos en un mes típico: ¿qué tareas se repiten cada día, cada semana y cada mes?", campo: "Inventario rápido (procesos)" },
          { texto: "De cada una: ¿cada cuánto ocurre y quién la hace?", campo: "Frecuencia" },
          { texto: "¿Cuáles le quitan más tiempo a usted o a su equipo?" },
          { texto: "¿Cuáles son las que más le molestan o donde más se equivocan?" },
          { texto: "Elegir juntos 2 o 3 para la siguiente parte (las más pesadas, repetidas o con errores)." },
        ],
      },
      {
        titulo: "4. Detalle de procesos (repetir por cada uno)", minutos: 40,
        objetivo: "Documentar el proceso paso a paso con un ejemplo real y reciente, no con lo que “debería” pasar.",
        preguntas: [
          { texto: "¿Qué hace que este proceso parta? ¿Un correo, una fecha, una falla, una solicitud?", campo: "Disparador" },
          { texto: "Cuénteme el último caso real, desde que partió hasta que terminó. ¿Qué pasó primero? ¿Y después?", campo: "Pasos", sondeo: "Preguntar “¿y después qué pasa?” hasta el final. Anotar quién hace cada paso." },
          { texto: "¿De dónde vienen los datos o documentos que necesitan? ¿Qué se entrega al final y a quién?", campo: "SIPOC (proveedores, entradas, salidas, clientes)" },
          { texto: "¿Con qué herramientas se hace? (Excel, correo, WhatsApp, papel, algún sistema)", campo: "Herramientas" },
          { texto: "¿Dónde viven los datos? ¿Están ordenados, repartidos en varias partes o solo en papel?", campo: "Estado de los datos" },
          { texto: "¿Cuánto demora cada vez? Pida un rango (mínimo y máximo) y el último caso concreto. ¿Cuántas veces por semana y cuántas personas lo hacen?", campo: "Tiempo (medición)", sondeo: "Registrar como “declarado”. Pedir permiso para cronometrar después." },
          { texto: "¿Cuándo hay excepciones? ¿Qué se hace distinto en esos casos?", campo: "Rúbrica: repetitivo y con reglas" },
        ],
      },
      {
        titulo: "5. Problemas y riesgos", minutos: 15,
        objetivo: "Detectar errores, retrabajo, dependencia de personas y riesgos legales o normativos.",
        preguntas: [
          { texto: "¿Qué errores o correcciones se repiten? ¿Qué costo o reclamo han traído?", campo: "Problemas / Rúbrica: errores y retrabajo" },
          { texto: "¿Qué pasaría si la persona que hace esto falta una semana?", campo: "Problemas (dependencia de personas)" },
          { texto: "¿Alguna parte tiene riesgo legal, normativo, de seguridad o de fiscalización?", campo: "Riesgo legal" },
          { texto: "¿Qué ha intentado antes para mejorarlo? ¿Qué pasó?" },
        ],
      },
      {
        titulo: "6. Prioridades y condiciones", minutos: 10,
        objetivo: "Saber qué es más valioso para el área y qué restricciones hay para cambiar algo.",
        preguntas: [
          { texto: "Si pudiera eliminar una tarea de su semana, ¿cuál sería?" },
          { texto: "¿Qué restricciones hay? Conectividad en centros, equipos, sistemas actuales, permisos, presupuesto.", campo: "Rúbrica: esfuerzo" },
          { texto: "¿Quién tendría que aprobar un cambio en este proceso?" },
        ],
      },
      {
        titulo: "7. Cierre", minutos: 5,
        objetivo: "Confirmar acuerdos y dejar la siguiente etapa agendada.",
        preguntas: [
          { texto: "Resumir en voz alta los procesos que se levantaron y confirmar que están bien entendidos." },
          { texto: "Pedir documentos de apoyo: planillas de ejemplo, formularios, reportes, procedimientos escritos." },
          { texto: "¿A qué trabajador del área conviene entrevistar? Pedir autorización para cronometrar una tarea." },
        ],
      },
    ],
  },

  trabajador: {
    titulo: "Entrevista a trabajador",
    resumen: "El trabajo real del día a día: mostrar cómo se hace, atajos y fricciones. Duración sugerida: 120 minutos (con parte de observación).",
    secciones: [
      {
        titulo: "1. Apertura y confidencialidad", minutos: 10,
        objetivo: "Que la persona se sienta segura. Aquí la confidencialidad es lo más importante.",
        preguntas: [
          { texto: "Explicar el objetivo: entender cómo se hace el trabajo para mejorarlo. No se evalúa a nadie." },
          { texto: "Dejar explícito: nada de lo que diga se atribuirá a usted en el informe ni se comparte con su jefatura con su nombre.", campo: "Notas privadas" },
          { texto: "Pedir permiso para tomar notas." },
        ],
      },
      {
        titulo: "2. Un día típico", minutos: 20,
        objetivo: "Ver el panorama de cómo se reparte el tiempo.",
        preguntas: [
          { texto: "Cuénteme su día de ayer, desde que llegó hasta que se fue." },
          { texto: "¿Qué cosas hace todos los días, cuáles una vez por semana y cuáles una vez al mes?", campo: "Inventario rápido (procesos)" },
          { texto: "¿En qué se le va más tiempo de lo que cree que debería?" },
        ],
      },
      {
        titulo: "3. Recorrido de una tarea real", minutos: 45,
        objetivo: "Que la persona muestre la tarea en vivo: pantalla, planilla, papel, correo. Contar pasos y medir.",
        preguntas: [
          { texto: "Muéstreme cómo hace [tarea elegida], con el último caso que le tocó.", campo: "Pasos", sondeo: "Pedir que lo haga o lo muestre. Anotar cada clic o cada paso." },
          { texto: "¿Qué lo hace partir? ¿De dónde saca los datos? ¿Qué entrega y a quién?", campo: "Disparador / SIPOC" },
          { texto: "¿Con qué herramientas? ¿Dónde guarda el resultado?", campo: "Herramientas / Estado de los datos" },
          { texto: "¿Cuánto demora cada vez? Con permiso, cronometrar un caso completo.", campo: "Tiempo (medición)", sondeo: "Registrar como “cronometrado”. Anotar mínimo y máximo vistos." },
          { texto: "¿Cuántas veces a la semana lo hace? ¿Quiénes más lo hacen igual?", campo: "Tiempo (medición)" },
        ],
      },
      {
        titulo: "4. Atajos y trabajos paralelos", minutos: 15,
        objetivo: "Descubrir lo que no está escrito en ningún procedimiento.",
        preguntas: [
          { texto: "¿Tiene alguna planilla, cuaderno o grupo de WhatsApp propio que use para esto?", campo: "Herramientas" },
          { texto: "¿Qué hace distinto de lo que dice el procedimiento (si existe)? ¿Por qué?" },
          { texto: "¿Qué sabe usted de este trabajo que no está escrito en ninguna parte?", campo: "Problemas (dependencia de personas)" },
        ],
      },
      {
        titulo: "5. Fricciones y errores", minutos: 15,
        objetivo: "Qué hace perder tiempo o genera errores desde la mirada de quien lo ejecuta.",
        preguntas: [
          { texto: "¿Qué datos tiene que escribir más de una vez o en más de un lugar?", campo: "Problemas / Rúbrica: errores y retrabajo" },
          { texto: "¿Qué espera de otros para poder avanzar? ¿Cuánto se demora esa espera?" },
          { texto: "Cuénteme la última vez que algo salió mal. ¿Qué pasó y cómo lo arreglaron?", campo: "Problemas" },
        ],
      },
      {
        titulo: "6. Ideas y cierre", minutos: 15,
        objetivo: "Recoger su propuesta y cerrar con respeto.",
        preguntas: [
          { texto: "Si pudiera cambiar una sola cosa de este trabajo, ¿qué sería?" },
          { texto: "Resumir lo entendido y confirmar. Recordar la confidencialidad." },
          { texto: "Pedir autorización para volver a observar o medir si hace falta." },
        ],
      },
    ],
  },
};

export const PRE_CHECKLIST = [
  "Confirmar con la gerencia la lista de áreas, encargados y trabajadores a entrevistar.",
  "Pedir antes de la reunión: organigrama, dotación por área, procedimientos escritos, ejemplos de planillas o formularios, lista de sistemas y software en uso.",
  "Acordar con la gerencia qué es confidencial y que el informe no atribuye frases a personas.",
  "Preparar la agenda: 120 minutos por entrevista; dejar 15 minutos libres antes y después para ordenar notas.",
  "Cargar las áreas y personas en la app y crear las entrevistas con fecha y hora.",
  "Probar el cronómetro y tener a mano la rúbrica de puntuación.",
  "Revisar la conectividad del lugar. Si es mala, llevar el guion impreso y pasar las notas a la app después.",
];

export const POST_PROTOCOL = [
  "Dentro de 24 horas: pasar las notas a la app (notas privadas de la entrevista, resumen sin nombres).",
  "Crear los procesos nuevos con el inventario rápido y vincularlos a la entrevista de la que salieron.",
  "Completar la ficha de los procesos detallados y subir su etapa a “Documentado”.",
  "Registrar las mediciones como declaradas o cronometradas, con su rango.",
  "Registrar las horas de la entrevista, el traslado y las notas.",
  "Anotar qué quedó por validar con el encargado.",
];

export const TIPS = [
  "Pida siempre el último caso real, no “lo que normalmente pasa”.",
  "Pida rangos de tiempo (mínimo y máximo), nunca un número redondo.",
  "Pregunte “¿y después qué pasa?” hasta llegar al final del proceso.",
  "No proponga soluciones durante la entrevista: solo entender.",
  "Anote las palabras de la persona; ordene después.",
  "Si el entrevistado se pone a la defensiva, vuelva a la confidencialidad y a que no se evalúa a nadie.",
];
