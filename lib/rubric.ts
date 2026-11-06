// Rúbrica de puntuación. Regla única: 5 = MUY favorable a automatizar, 1 = poco favorable.
// Ajustar los textos aquí cambia el formulario, la guía y el reporte.

export type RubricItem = {
  key: "frecuencia_volumen" | "tiempo" | "repetitivo_reglas" | "entradas_digitales" | "errores_retrabajo" | "quien_lo_asume";
  label: string;
  pregunta: string;
  uno: string;
  tres: string;
  cinco: string;
};

export const RUBRIC: RubricItem[] = [
  {
    key: "frecuencia_volumen", label: "Frecuencia / volumen",
    pregunta: "¿Cuántas veces ocurre y con cuánto volumen?",
    uno: "Menos de una vez al mes, o un caso por vez.",
    tres: "Semanal, o decenas de casos al mes.",
    cinco: "Diario o varias veces por semana, con alto volumen (cientos de casos al mes).",
  },
  {
    key: "tiempo", label: "Tiempo que consume",
    pregunta: "¿Cuánto tiempo total por semana, sumando a todas las personas?",
    uno: "Menos de 1 hora por semana.",
    tres: "Entre 4 y 8 horas por semana.",
    cinco: "Más de 16 horas por semana (media jornada completa o más).",
  },
  {
    key: "repetitivo_reglas", label: "Repetitivo y con reglas",
    pregunta: "¿Se hace siempre igual? ¿Las reglas se pueden escribir?",
    uno: "Depende del criterio de la persona caso a caso; no hay reglas claras.",
    tres: "Hay reglas claras, pero con excepciones frecuentes.",
    cinco: "Siempre los mismos pasos y reglas; las excepciones son raras.",
  },
  {
    key: "entradas_digitales", label: "Entradas digitales",
    pregunta: "¿Los datos de entrada ya están en formato digital?",
    uno: "Papel, llamadas o conversación verbal.",
    tres: "Digitales pero dispersos o desordenados (correo, WhatsApp, PDFs).",
    cinco: "Digitales y estructurados (planillas ordenadas, sistemas con campos).",
  },
  {
    key: "errores_retrabajo", label: "Errores / retrabajo",
    pregunta: "¿Con qué frecuencia hay errores, correcciones o reclamos?",
    uno: "Casi nunca hay errores.",
    tres: "Errores ocasionales (una vez al mes) que se corrigen sin mayor costo.",
    cinco: "Errores frecuentes con costo, retrabajo, reclamos o multas.",
  },
  {
    key: "quien_lo_asume", label: "Quién lo asume (carga)",
    pregunta: "¿Qué perfil lo hace hoy y qué deja de hacer por ello?",
    uno: "Un cargo dedicado cuyo trabajo principal es justamente esto.",
    tres: "Personal administrativo o de apoyo que lo combina con otras funciones.",
    cinco: "Personal calificado o jefatura que pierde tiempo de su trabajo principal.",
  },
];

export const EFFORT_RUBRIC = {
  label: "Esfuerzo de implementar",
  uno: "Configuración simple con herramientas que ya existen; hasta 1 semana.",
  tres: "Integrar 2 sistemas o crear un flujo nuevo; 2 a 4 semanas.",
  cinco: "Desarrollo a medida, varios sistemas o cambio organizacional grande; más de 2 meses.",
};
