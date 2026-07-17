// Prompt da chamada 1 do Modo Exame (CLAUDE.md §9): elaborador de prova.
// Structured output garante a forma; o prompt garante o conteúdo ancorado
// 100% no material do professor. Texto em espanhol: idioma do produto.

export interface ExamGenerationPromptParams {
  subjectName: string;
  topicTitle: string;
  ragChunks: string[];
  cognitiveProfile: unknown;
  mcCount: number;
  essayCount: number;
  mode: 'main' | 'retry';
  // retry: statements das questões que o aluno errou no exame de origem
  missedStatements?: string[];
}

export function buildExamGenerationSystemPrompt(
  params: ExamGenerationPromptParams,
): string {
  const blocks: string[] = [];

  blocks.push(
    [
      '# Rol',
      `Eres un elaborador de exámenes para la asignatura "${params.subjectName}", tema "${params.topicTitle}".`,
      'Generas preguntas basadas EXCLUSIVAMENTE en el material del curso proporcionado abajo.',
      'Nunca uses conocimiento general que no esté respaldado por el material.',
    ].join('\n'),
  );

  const numberedChunks = params.ragChunks
    .map((chunk, index) => `[${index + 1}] ${chunk}`)
    .join('\n\n');
  blocks.push(`# Material del curso\n${numberedChunks}`);

  if (params.cognitiveProfile != null) {
    blocks.push(
      [
        '# Perfil cognitivo del alumno',
        JSON.stringify(params.cognitiveProfile),
        'Adapta la redacción de los enunciados al perfil (sin cambiar la dificultad conceptual).',
      ].join('\n'),
    );
  }

  blocks.push(
    [
      '# Formato del examen',
      `- Genera exactamente ${params.mcCount} pregunta(s) de opción múltiple (type "multiple_choice") y ${params.essayCount} pregunta(s) de desarrollo (type "essay"), en ese orden.`,
      '- Cada pregunta de opción múltiple tiene exactamente 4 alternativas con ids "a", "b", "c", "d", textos distintos entre sí y exactamente una correcta (correct_option_id).',
      '- "rationale": explica por qué la alternativa correcta es correcta, citando el material.',
      '- Cada pregunta de desarrollo incluye "hint" (conceptos que el alumno puede mencionar, visible para el alumno) y de 2 a 4 "key_points" (criterios de evaluación, NUNCA visibles para el alumno).',
      '- "concept_label": etiqueta corta del concepto evaluado (ej: "Derivadas").',
      '- "source_reference": referencia del fragmento del material usado (ej: "[2]").',
      '- Ids de pregunta únicos: "q1", "q2", ...',
      '- Todo el texto visible en español.',
    ].join('\n'),
  );

  if (params.mode === 'retry' && params.missedStatements?.length) {
    blocks.push(
      [
        '# Modo práctica de puntos débiles',
        'El alumno falló las siguientes preguntas en un examen anterior:',
        ...params.missedStatements.map((statement) => `- ${statement}`),
        'Genera preguntas NUEVAS sobre los mismos conceptos — nunca repitas los enunciados anteriores.',
      ].join('\n'),
    );
  }

  return blocks.join('\n\n');
}

export const EXAM_GENERATION_USER_MESSAGE =
  'Genera el examen ahora, en el formato JSON del esquema solicitado.';
