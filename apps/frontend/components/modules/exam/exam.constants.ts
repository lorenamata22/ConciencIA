export const EXAM_TEXT = {
  studyMode: "Modo estudios",
  examMode: "Modo Examen",
  titleSuffix: "Test de conocimientos",
  topicPlaceholder: "Temario",
  confirm: "Confirmar",
  introduction: (name: string) =>
    `¡Hola, ${name}! Vamos a repasar los conceptos clave que has estado estudiando. Te haré preguntas para evaluar tu comprensión. Puedes responder seleccionando una opción o escribiendo tu respuesta.`,
  question: "PREGUNTA",
  submitAnswer: "Enviar respuesta",
  essayPlaceholder: "Escribe tu explicación aquí...",
  preparing: "Preparando tu test...",
  preparingDetail:
    "Estamos creando preguntas basadas en el material de este tema. Puede tardar unos segundos.",
  submitting: "Revisando tus respuestas...",
  submittingDetail:
    "Estamos preparando un feedback personalizado para cada pregunta.",
  reviewTitle: "REVISIÓN PREGUNTA A PREGUNTA",
  correct: "CORRECTO",
  incorrect: "INCORRECTO",
  retry: "Practicar puntos débiles",
  viewNotes: "Ver apuntes del tema",
  completed: "Has completado el test de",
  retryError: "No pudimos preparar la práctica. Inténtalo de nuevo.",
  generationError:
    "Este tema todavía no tiene material suficiente para preparar un test.",
  genericError: "Algo salió mal. Inténtalo de nuevo.",
  submitError:
    "No pudimos revisar tus respuestas. No te preocupes: siguen guardadas en esta pantalla.",
  tryAgain: "Intentar de nuevo",
} as const;

export const EXAM_ESSAY_MAX_LENGTH = 600;
