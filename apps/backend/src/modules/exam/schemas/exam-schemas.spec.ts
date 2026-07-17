import {
  buildExamContentSchema,
  examContentSchema,
} from './exam-content.schema';
import {
  correctionResponseSchema,
  normalizeCorrectionPayload,
} from './correction-response.schema';
import {
  EXAM_MAIN_ESSAY_COUNT,
  EXAM_MAIN_MC_COUNT,
  buildResultSummary,
} from '../exam.constants';

// Conteúdo válido de exame main (3 MC + 2 dissertativas)
const validMc = (id: string) => ({
  id,
  type: 'multiple_choice' as const,
  concept_label: 'Derivadas',
  statement: `¿Cuál es la derivada? (${id})`,
  options: [
    { id: 'a', text: 'Opción A' },
    { id: 'b', text: 'Opción B' },
    { id: 'c', text: 'Opción C' },
    { id: 'd', text: 'Opción D' },
  ],
  correct_option_id: 'b',
  rationale: 'La regla de la potencia.',
  source_reference: 'Apunte 1, sección 2',
});

const validEssay = (id: string) => ({
  id,
  type: 'essay' as const,
  concept_label: 'Integrales',
  statement: `Explica el concepto (${id})`,
  hint: 'Puedes mencionar sumas de Riemann',
  key_points: ['Reconoce el límite de sumas', 'Relaciona con el área'],
  source_reference: 'Apunte 2, sección 1',
});

const validContent = {
  questions: [
    validMc('q1'),
    validMc('q2'),
    validMc('q3'),
    validEssay('q4'),
    validEssay('q5'),
  ],
};

describe('examContentSchema (semantic refinements)', () => {
  const mainSchema = buildExamContentSchema(
    EXAM_MAIN_MC_COUNT,
    EXAM_MAIN_ESSAY_COUNT,
  );

  it('should accept a valid main exam content (3 MC + 2 essay)', () => {
    expect(mainSchema.safeParse(validContent).success).toBe(true);
  });

  it('should reject duplicated question ids', () => {
    const content = {
      questions: [
        validMc('q1'),
        validMc('q1'),
        validMc('q3'),
        validEssay('q4'),
        validEssay('q5'),
      ],
    };
    expect(mainSchema.safeParse(content).success).toBe(false);
  });

  it('should reject duplicated option texts within a question', () => {
    const broken = {
      ...validMc('q1'),
      options: [
        { id: 'a', text: 'Misma opción' },
        { id: 'b', text: 'Misma opción' },
        { id: 'c', text: 'Opción C' },
        { id: 'd', text: 'Opción D' },
      ],
    };
    const content = {
      questions: [
        broken,
        validMc('q2'),
        validMc('q3'),
        validEssay('q4'),
        validEssay('q5'),
      ],
    };
    expect(mainSchema.safeParse(content).success).toBe(false);
  });

  it('should reject when MC/essay counts do not match the expected mix', () => {
    const content = {
      questions: [
        validMc('q1'),
        validMc('q2'),
        validEssay('q3'),
        validEssay('q4'),
        validEssay('q5'),
      ],
    };
    expect(mainSchema.safeParse(content).success).toBe(false);
  });

  it('should reject when correct_option_id is not among the options', () => {
    // ids duplicados 'a','a','b','c' — 'd' não existe entre as opções
    const broken = {
      ...validMc('q1'),
      options: [
        { id: 'a', text: 'Opción A' },
        { id: 'a', text: 'Opción A2' },
        { id: 'b', text: 'Opción B' },
        { id: 'c', text: 'Opción C' },
      ],
      correct_option_id: 'd',
    };
    const content = {
      questions: [
        broken,
        validMc('q2'),
        validMc('q3'),
        validEssay('q4'),
        validEssay('q5'),
      ],
    };
    expect(mainSchema.safeParse(content).success).toBe(false);
  });

  it('should reject MC with more or fewer than 4 options', () => {
    const broken = {
      ...validMc('q1'),
      options: validMc('q1').options.slice(0, 3),
    };
    expect(examContentSchema.safeParse({ questions: [broken] }).success).toBe(
      false,
    );
  });

  it('should reject essay with fewer than 2 key_points', () => {
    const broken = { ...validEssay('q1'), key_points: ['Solo uno'] };
    expect(examContentSchema.safeParse({ questions: [broken] }).success).toBe(
      false,
    );
  });
});

describe('correctionResponseSchema', () => {
  it('should parse a valid correction payload', () => {
    const payload = {
      results: [
        { question_id: 'q1', verdict: 'correct', feedback: 'Bien hecho' },
        { question_id: 'q4', verdict: 'incorrect', feedback: 'Te faltó X' },
      ],
    };
    expect(correctionResponseSchema.safeParse(payload).success).toBe(true);
  });

  it('should parse capitalized verdict "Correct" as "correct" after normalization', () => {
    // A API não garante capitalização de enums de string
    const payload = normalizeCorrectionPayload({
      results: [
        { question_id: 'q1', verdict: 'Correct', feedback: 'Bien' },
        { question_id: 'q2', verdict: 'INCORRECT', feedback: 'Mal' },
      ],
    });

    const parsed = correctionResponseSchema.parse(payload);
    expect(parsed.results[0].verdict).toBe('correct');
    expect(parsed.results[1].verdict).toBe('incorrect');
  });

  it('should reject verdicts outside the binary enum', () => {
    const payload = normalizeCorrectionPayload({
      results: [{ question_id: 'q1', verdict: 'partial', feedback: 'Casi' }],
    });
    expect(correctionResponseSchema.safeParse(payload).success).toBe(false);
  });
});

describe('buildResultSummary', () => {
  it('should build a summary in code (no AI) including the student name for every score band', () => {
    for (let score = 0; score <= 5; score++) {
      const summary = buildResultSummary(score, 'Ana');
      expect(summary).toContain('Ana');
      expect(summary.length).toBeGreaterThan(10);
    }
  });

  it('should return different summaries for different score bands', () => {
    expect(buildResultSummary(0, 'Ana')).not.toBe(buildResultSummary(5, 'Ana'));
    expect(buildResultSummary(2, 'Ana')).not.toBe(buildResultSummary(4, 'Ana'));
  });
});
