// Constantes do Modo Exame (CLAUDE.md §8) — formato do quiz e limites das
// duas chamadas de IA. Nunca hardcodar estes valores nos services/prompts.

export const EXAM_MAIN_QUESTIONS = 5;
export const EXAM_MAIN_MC_COUNT = 3;
export const EXAM_MAIN_ESSAY_COUNT = 2;

// Retry ("Practicar puntos débiles"): n = min(erradas, EXAM_RETRY_MAX_QUESTIONS)
export const EXAM_RETRY_MAX_QUESTIONS = 3;

export const EXAM_MAIN_RAG_CHUNKS = 5;
export const EXAM_RETRY_RAG_CHUNKS = 3;

export const EXAM_ESSAY_MAX_CHARS = 600;

// Dimensionados com folga: truncamento por max_tokens quebra o structured
// output (JSON incompleto) — tratado explicitamente no adapter
export const EXAM_GENERATION_MAX_TOKENS = 4000;
export const EXAM_CORRECTION_MAX_TOKENS = 2000;

// Dissertativa em branco: verdict = incorrect decidido em código, sem ir à IA
export const EXAM_BLANK_ESSAY_FEEDBACK =
  'No respondiste esta pregunta. Revisa el material del tema e inténtalo de nuevo en un examen de práctica.';

// result_summary é template em código por faixa de score — sem IA (CLAUDE.md §8)
export function buildResultSummary(score: number, studentName: string): string {
  if (score <= 1) {
    return `${studentName}, este tema todavía necesita trabajo. Repasa el material y usa "Practicar puntos débiles" para reforzar los conceptos.`;
  }
  if (score <= 3) {
    return `¡Buen intento, ${studentName}! Ya dominas parte del tema, pero hay conceptos por reforzar. Revisa el feedback de cada pregunta.`;
  }
  if (score === 4) {
    return `¡Muy bien, ${studentName}! Estás cerca del dominio completo del tema. Revisa la pregunta que fallaste para cerrar la brecha.`;
  }
  return `¡Excelente, ${studentName}! Respondiste todo correctamente. Dominas este tema.`;
}
