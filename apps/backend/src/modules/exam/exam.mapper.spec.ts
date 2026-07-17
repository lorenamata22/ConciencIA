import { toPublicQuestions, toResultDto } from './exam.mapper';
import { ExamContent } from './schemas/exam-content.schema';
import { StudentAnswer } from './schemas/exam-content.schema';

const content: ExamContent = {
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      concept_label: 'Derivadas',
      statement: '¿Cuál es la derivada de x²?',
      options: [
        { id: 'a', text: 'x' },
        { id: 'b', text: '2x' },
        { id: 'c', text: 'x²' },
        { id: 'd', text: '2' },
      ],
      correct_option_id: 'b',
      rationale: 'Regla de la potencia.',
      source_reference: 'Apunte 1',
    },
    {
      id: 'q2',
      type: 'essay',
      concept_label: 'Integrales',
      statement: 'Explica el concepto de integral definida',
      hint: 'Puedes mencionar sumas de Riemann',
      key_points: ['Límite de sumas', 'Área bajo la curva'],
      source_reference: 'Apunte 2',
    },
  ],
};

describe('toPublicQuestions (vazamento de gabarito — crítico)', () => {
  it('should not expose correct_option_id, rationale or source_reference in MC public DTO', () => {
    const [mc] = toPublicQuestions(content);

    expect(mc).not.toHaveProperty('correct_option_id');
    expect(mc).not.toHaveProperty('rationale');
    expect(mc).not.toHaveProperty('source_reference');
    // Nada do gabarito pode vazar nem em campos aninhados
    expect(JSON.stringify(mc)).not.toContain('correct_option_id');
    expect(JSON.stringify(mc)).not.toContain('Regla de la potencia');
  });

  it('should not expose key_points nor source_reference in essay public DTO, but keep hint', () => {
    const [, essay] = toPublicQuestions(content);

    expect(essay).not.toHaveProperty('key_points');
    expect(essay).not.toHaveProperty('source_reference');
    expect(essay.hint).toBe('Puedes mencionar sumas de Riemann');
    expect(JSON.stringify(essay)).not.toContain('Límite de sumas');
  });

  it('should keep public fields and array order (question order = array order)', () => {
    const questions = toPublicQuestions(content);

    expect(questions.map((question) => question.id)).toEqual(['q1', 'q2']);
    expect(questions[0]).toMatchObject({
      id: 'q1',
      type: 'multiple_choice',
      concept_label: 'Derivadas',
      statement: '¿Cuál es la derivada de x²?',
    });
    expect(questions[0].options).toHaveLength(4);
    expect(questions[0].options?.[1]).toEqual({ id: 'b', text: '2x' });
    // MC não tem hint; essay não tem options
    expect(questions[0].hint).toBeUndefined();
    expect(questions[1].options).toBeUndefined();
  });
});

describe('toResultDto (vazamento de gabarito — crítico)', () => {
  const answers: StudentAnswer[] = [
    {
      question_id: 'q1',
      selected_option_id: 'b',
      essay_text: null,
      verdict: 'correct',
      feedback: 'Elegiste la opción correcta.',
    },
    {
      question_id: 'q2',
      selected_option_id: null,
      essay_text: 'Es el área bajo la curva',
      verdict: 'incorrect',
      feedback: 'Te faltó mencionar el límite de sumas.',
    },
  ];

  const exam = {
    id: 'exam-id-1',
    final_score: 1,
    result_summary: 'Buen intento, Ana!',
    completed_at: new Date('2026-07-16T12:00:00Z'),
    execution_time: 300,
    exam_content_json: content,
    student_answers_json: { answers },
  };

  it('should not contain correct_option_id, rationale or key_points anywhere in the result DTO', () => {
    const result = toResultDto(exam);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('correct_option_id');
    expect(serialized).not.toContain('rationale');
    expect(serialized).not.toContain('key_points');
    expect(serialized).not.toContain('source_reference');
  });

  it('should build the result from persisted JSONs with verdict and feedback per question', () => {
    const result = toResultDto(exam);

    expect(result).toMatchObject({
      exam_id: 'exam-id-1',
      final_score: 1,
      total_questions: 2,
      result_summary: 'Buen intento, Ana!',
      execution_time: 300,
    });
    expect(result.questions).toEqual([
      {
        id: 'q1',
        concept_label: 'Derivadas',
        verdict: 'correct',
        feedback: 'Elegiste la opción correcta.',
      },
      {
        id: 'q2',
        concept_label: 'Integrales',
        verdict: 'incorrect',
        feedback: 'Te faltó mencionar el límite de sumas.',
      },
    ]);
  });

  it('should not carry statement nor options in the result DTO (result screen does not show them)', () => {
    const result = toResultDto(exam);

    for (const question of result.questions) {
      expect(question).not.toHaveProperty('statement');
      expect(question).not.toHaveProperty('options');
    }
  });
});
