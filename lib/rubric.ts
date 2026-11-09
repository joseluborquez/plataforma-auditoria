// Rúbrica de puntuación. Regla única: 5 = MUY favorable a automatizar, 1 = poco favorable.
// Ajustar los textos aquí cambia el formulario, la guía y el reporte.

export type RubricItem = {
  key: "frecuencia_volumen" | "tiempo" | "repetitivo_reglas" | "entradas_digitales" | "errores_retrabajo" | "quien_lo_asume";
  label: string;
  pregunta: string;
  uno: string;
  tres: string;
  cinco: string;
  /** Cómo se mide o se sugiere en la plataforma (umbrales exactos y de dónde salen los datos). */
  medida: string;
};

export const RUBRIC: RubricItem[] = [
  {
    key: "frecuencia_volumen", label: "Frecuencia / volumen",
    pregunta: "¿Cuántas veces ocurre y con cuánto volumen?",
    uno: "Menos de una vez al mes, o un caso por vez.",
    tres: "Semanal, o decenas de casos al mes.",
    cinco: "Diario o varias veces por semana, con alto volumen (cientos de casos al mes).",
    medida: "1 = menos de 1 vez al mes · 2 = mensual · 3 = semanal · 4 = varias veces por semana · 5 = diario. Se sugiere desde las veces por semana de la medición, o desde la frecuencia del inventario.",
  },
  {
    key: "tiempo", label: "Tiempo que consume",
    pregunta: "¿Cuánto tiempo total por semana, sumando a todas las personas?",
    uno: "Menos de 1 hora por semana.",
    tres: "Entre 4 y 8 horas por semana.",
    cinco: "Más de 16 horas por semana (media jornada completa o más).",
    medida: "1 = menos de 1 h · 2 = 1 a 4 h · 3 = 4 a 8 h · 4 = 8 a 16 h · 5 = más de 16 h por semana. Se calcula: minutos por vez × veces por semana × personas.",
  },
  {
    key: "repetitivo_reglas", label: "Repetitivo y con reglas",
    pregunta: "¿Se hace siempre igual? ¿Las reglas se pueden escribir?",
    uno: "Depende del criterio de la persona caso a caso; no hay reglas claras.",
    tres: "Hay reglas claras, pero con excepciones frecuentes.",
    cinco: "Siempre los mismos pasos y reglas; las excepciones son raras.",
    medida: "Se sugiere desde las excepciones anotadas en la ficha y desde cuántos pasos del mapa son decisiones (rombos). Pocas excepciones y pocas decisiones = más cerca de 5.",
  },
  {
    key: "entradas_digitales", label: "Entradas digitales",
    pregunta: "¿Los datos de entrada ya están en formato digital?",
    uno: "Papel, llamadas o conversación verbal.",
    tres: "Digitales pero dispersos o desordenados (correo, WhatsApp, PDFs).",
    cinco: "Digitales y estructurados (planillas ordenadas, sistemas con campos).",
    medida: "Se sugiere desde «Estado de los datos»: estructurados = 5 · dispersos = 3 · en papel o inexistentes = 1.",
  },
  {
    key: "errores_retrabajo", label: "Errores / retrabajo",
    pregunta: "¿Con qué frecuencia hay errores, correcciones o reclamos?",
    uno: "Casi nunca hay errores.",
    tres: "Errores ocasionales (una vez al mes) que se corrigen sin mayor costo.",
    cinco: "Errores frecuentes con costo, retrabajo, reclamos o multas.",
    medida: "Se sugiere desde los errores o retrabajos dichos en la entrevista y los pasos marcados con ⚠: ninguno = 1 · uno = 3 · dos = 4 · tres o más = 5.",
  },
  {
    key: "quien_lo_asume", label: "Quién lo asume (carga)",
    pregunta: "¿Qué tan valioso es el tiempo de quien lo hace hoy, y qué deja de hacer por ello?",
    uno: "Un cargo dedicado cuyo trabajo principal es justamente esto.",
    tres: "Personal administrativo o de apoyo que lo combina con otras funciones.",
    cinco: "Personal calificado o jefatura que pierde tiempo de su trabajo principal.",
    medida: "No se calcula: mide el costo de oportunidad de quien lo hace. La plataforma muestra quién ejecuta los pasos y su cargo para que lo juzgues.",
  },
];

export const EFFORT_RUBRIC = {
  label: "Esfuerzo de implementar",
  uno: "Configuración simple con herramientas que ya existen; hasta 1 semana.",
  tres: "Integrar 2 sistemas o crear un flujo nuevo; 2 a 4 semanas.",
  cinco: "Desarrollo a medida, varios sistemas o cambio organizacional grande; más de 2 meses.",
  medida: "Pista, no cálculo: suman esfuerzo las restricciones mencionadas, usar varias herramientas o pasos en sistema, datos en papel y que varias personas deban aprobar el cambio.",
};
