import { z } from 'zod';

// Schemas do conteúdo de exame gerado pela IA (chamada 1 — structured output).
// O JSON Schema enviado ao provider vem do schema base (sem refinements);
// a validação semântica (buildExamContentSchema) roda sobre a resposta.
//
// Campos SECRETOS (gabarito — nunca saem do backend antes do submit):
// correct_option_id, rationale, key_points, source_reference.
// `hint` é PÚBLICO ("puedes mencionar X"); `key_points` é rubrica de avaliação.

export const optionSchema = z.object({
  id: z.enum(['a', 'b', 'c', 'd']),
  text: z.string(),
});

export const multipleChoiceSchema = z.object({
  id: z.string(),
  type: z.literal('multiple_choice'),
  concept_label: z.string(),
  statement: z.string(),
  options: z.array(optionSchema).length(4),
  correct_option_id: z.enum(['a', 'b', 'c', 'd']), // SECRETO
  rationale: z.string(), // SECRETO — ancora a correção no material
  source_reference: z.string(), // SECRETO — audit/debug
});

export const essaySchema = z.object({
  id: z.string(),
  type: z.literal('essay'),
  concept_label: z.string(),
  statement: z.string(),
  hint: z.string(), // PÚBLICO
  key_points: z.array(z.string()).min(2).max(4), // SECRETO — rubrica
  source_reference: z.string(), // SECRETO
});

// Ordem das questões = ordem do array — sem campo `order`
export const examContentSchema = z.object({
  questions: z.array(
    z.discriminatedUnion('type', [multipleChoiceSchema, essaySchema]),
  ),
});

export type ExamContent = z.infer<typeof examContentSchema>;
export type ExamQuestion = ExamContent['questions'][number];
export type MultipleChoiceQuestion = z.infer<typeof multipleChoiceSchema>;
export type EssayQuestion = z.infer<typeof essaySchema>;

// Structured output garante forma, não sentido — refinements semânticos
// obrigatórios antes de persistir. Parametrizado por contagem porque o
// retry tem mix diferente do main.
export const buildExamContentSchema = (mcCount: number, essayCount: number) =>
  examContentSchema.superRefine((content, ctx) => {
    const ids = content.questions.map((question) => question.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'IDs de questão duplicados' });
    }

    const mcQuestions = content.questions.filter(
      (question) => question.type === 'multiple_choice',
    );
    const essayQuestions = content.questions.filter(
      (question) => question.type === 'essay',
    );
    if (
      mcQuestions.length !== mcCount ||
      essayQuestions.length !== essayCount
    ) {
      ctx.addIssue({
        code: 'custom',
        message: `Mix esperado: ${mcCount} MC + ${essayCount} dissertativas; recebido: ${mcQuestions.length} MC + ${essayQuestions.length} dissertativas`,
      });
    }

    for (const question of mcQuestions) {
      const optionIds = question.options.map((option) => option.id);
      if (new Set(optionIds).size !== optionIds.length) {
        ctx.addIssue({
          code: 'custom',
          message: `Questão ${question.id}: IDs de alternativa duplicados`,
        });
      }

      const optionTexts = question.options.map((option) => option.text.trim());
      if (new Set(optionTexts).size !== optionTexts.length) {
        ctx.addIssue({
          code: 'custom',
          message: `Questão ${question.id}: alternativas com texto duplicado`,
        });
      }

      if (!optionIds.includes(question.correct_option_id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Questão ${question.id}: correct_option_id fora das alternativas`,
        });
      }
    }
  });

// ─── Respostas do aluno (student_answers_json) ─────────────────────────────

export const studentAnswerSchema = z.object({
  question_id: z.string(),
  selected_option_id: z.enum(['a', 'b', 'c', 'd']).nullable(),
  essay_text: z.string().max(600).nullable(),
  verdict: z.enum(['correct', 'incorrect']).nullable(),
  feedback: z.string().nullable(),
});

export type StudentAnswer = z.infer<typeof studentAnswerSchema>;

export const studentAnswersSchema = z.object({
  answers: z.array(studentAnswerSchema),
});

export type StudentAnswers = z.infer<typeof studentAnswersSchema>;
