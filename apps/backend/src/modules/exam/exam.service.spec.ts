import { Test, TestingModule } from '@nestjs/testing';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExamService } from './exam.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { RagService } from '../rag/rag.service';
import { AIUsageService } from '../ai-usage/ai-usage.service';
import { TopicProgressService } from '../topic-progress/topic-progress.service';
import { StudentMetricsService } from '../student-metrics/student-metrics.service';
import { ExamContent, StudentAnswer } from './schemas/exam-content.schema';
import { EXAM_BLANK_ESSAY_FEEDBACK } from './exam.constants';
import { AIResponseTruncatedError } from '../ai-provider/ai-provider.interface';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const institutionId = 'inst-id-1';
const userId = 'user-id-1';
const studentId = 'student-id-1';
const topicId = 'topic-id-1';
const subjectId = 'subject-id-1';

const mockStudent = {
  id: studentId,
  user_id: userId,
  cognitive_profile: { style: 'visual' },
  user: {
    id: userId,
    name: 'Ana',
    institution_id: institutionId,
    is_minor: false,
  },
};

const mockTopic = {
  id: topicId,
  title: 'Derivadas',
  description: 'Reglas de derivación',
  module: {
    id: 'module-id-1',
    subject_id: subjectId,
    subject: {
      id: subjectId,
      name: 'Matemática',
      course: { institution_id: institutionId },
    },
  },
};

const validMc = (id: string, correct: 'a' | 'b' | 'c' | 'd' = 'b') => ({
  id,
  type: 'multiple_choice' as const,
  concept_label: 'Derivadas',
  statement: `¿Pregunta MC ${id}?`,
  options: [
    { id: 'a' as const, text: `Opción A de ${id}` },
    { id: 'b' as const, text: `Opción B de ${id}` },
    { id: 'c' as const, text: `Opción C de ${id}` },
    { id: 'd' as const, text: `Opción D de ${id}` },
  ],
  correct_option_id: correct,
  rationale: `Justificación de ${id}`,
  source_reference: '[1]',
});

const validEssay = (id: string) => ({
  id,
  type: 'essay' as const,
  concept_label: 'Integrales',
  statement: `Explica el concepto (${id})`,
  hint: 'Puedes mencionar sumas de Riemann',
  key_points: ['Punto clave 1', 'Punto clave 2'],
  source_reference: '[2]',
});

const mainContent: ExamContent = {
  questions: [
    validMc('q1'),
    validMc('q2'),
    validMc('q3'),
    validEssay('q4'),
    validEssay('q5'),
  ],
};

const ragResult = {
  chunks: [
    {
      id: 'c1',
      chunk_text: 'Material del profesor 1',
      metadata: {},
      distance: 0.1,
    },
    {
      id: 'c2',
      chunk_text: 'Material del profesor 2',
      metadata: {},
      distance: 0.2,
    },
  ],
  hasSufficientContext: true,
};

describe('ExamService', () => {
  let service: ExamService;
  let prismaMock: PrismaMock;
  let aiProviderServiceMock: {
    completeStructured: jest.Mock;
    getProvider: jest.Mock;
  };
  let ragServiceMock: { search: jest.Mock };
  let aiUsageServiceMock: {
    register: jest.Mock;
    hasAvailableTokens: jest.Mock;
  };
  let topicProgressServiceMock: { markAsCompleted: jest.Mock };
  let studentMetricsServiceMock: { updateAfterExam: jest.Mock };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    aiProviderServiceMock = {
      completeStructured: jest.fn(),
      getProvider: jest.fn().mockReturnValue({
        getProviderName: () => 'mock',
        getModelName: () => 'mock-model',
      }),
    };
    ragServiceMock = { search: jest.fn().mockResolvedValue(ragResult) };
    aiUsageServiceMock = {
      register: jest.fn().mockResolvedValue({}),
      hasAvailableTokens: jest.fn().mockResolvedValue(true),
    };
    topicProgressServiceMock = {
      markAsCompleted: jest.fn().mockResolvedValue({}),
    };
    studentMetricsServiceMock = {
      updateAfterExam: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AIProviderService, useValue: aiProviderServiceMock },
        { provide: RagService, useValue: ragServiceMock },
        { provide: AIUsageService, useValue: aiUsageServiceMock },
        { provide: TopicProgressService, useValue: topicProgressServiceMock },
        { provide: StudentMetricsService, useValue: studentMetricsServiceMock },
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);

    // Cenário-base feliz para generate()
    prismaMock.student.findUnique.mockResolvedValue(mockStudent as any);
    prismaMock.topic.findUnique.mockResolvedValue(mockTopic as any);
    prismaMock.exam.create.mockResolvedValue({
      id: 'exam-id-1',
      exam_content_json: mainContent,
    } as any);
    aiProviderServiceMock.completeStructured.mockResolvedValue({
      data: mainContent,
      promptTokens: 100,
      responseTokens: 200,
    });
  });

  // ─── Geração — main ───────────────────────────────────────────────────────

  describe('generate (main)', () => {
    const dto = { topic_id: topicId, type: 'main' as const };

    it('should generate a main exam and return public questions without answer key', async () => {
      const result = await service.generate(userId, institutionId, dto);

      expect(result.exam_id).toBe('exam-id-1');
      expect(result.questions).toHaveLength(5);
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('correct_option_id');
      expect(serialized).not.toContain('rationale');
      expect(serialized).not.toContain('key_points');
      expect(serialized).not.toContain('source_reference');

      // Chamada 1 com RAG + perfil cognitivo no prompt e schema JSON
      const call = aiProviderServiceMock.completeStructured.mock.calls[0][0];
      expect(call.system).toContain('Material del profesor 1');
      expect(call.system).toContain(JSON.stringify({ style: 'visual' }));
      expect(call.jsonSchema).toBeDefined();

      // Persistência com o conteúdo completo (gabarito fica no banco)
      expect(prismaMock.exam.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            student_id: studentId,
            subject_id: subjectId,
            topic_id: topicId,
            exam_type: 'main',
            exam_content_json: mainContent,
          }),
        }),
      );
    });

    it('should search RAG by subject with institution filter and top 5 chunks for main', async () => {
      await service.generate(userId, institutionId, dto);

      expect(ragServiceMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          institutionId,
          subjectId,
          topK: 5,
          query: expect.stringContaining('Derivadas'),
        }),
      );
      expect(ragServiceMock.search.mock.calls[0][0]).not.toHaveProperty(
        'topicId',
      );
    });

    it('should throw NotFoundException when topic does not exist', async () => {
      prismaMock.topic.findUnique.mockResolvedValue(null);

      await expect(
        service.generate(userId, institutionId, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when topic belongs to another tenant', async () => {
      prismaMock.topic.findUnique.mockResolvedValue({
        ...mockTopic,
        module: {
          ...mockTopic.module,
          subject: {
            ...mockTopic.module.subject,
            course: { institution_id: 'other-inst' },
          },
        },
      } as any);

      await expect(
        service.generate(userId, institutionId, dto),
      ).rejects.toThrow(ForbiddenException);
      expect(aiProviderServiceMock.completeStructured).not.toHaveBeenCalled();
    });

    it('should return 422 when RAG has no chunks — no fallback to general knowledge', async () => {
      ragServiceMock.search.mockResolvedValue({
        chunks: [],
        hasSufficientContext: false,
      });

      await expect(
        service.generate(userId, institutionId, dto),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(aiProviderServiceMock.completeStructured).not.toHaveBeenCalled();
      expect(prismaMock.exam.create).not.toHaveBeenCalled();
    });

    it('should return 422 when RAG marks non-empty context as insufficient', async () => {
      ragServiceMock.search.mockResolvedValue({
        ...ragResult,
        hasSufficientContext: false,
      });

      await expect(
        service.generate(userId, institutionId, dto),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(aiProviderServiceMock.completeStructured).not.toHaveBeenCalled();
      expect(prismaMock.exam.create).not.toHaveBeenCalled();
    });

    it('should reject a student resolved from a different tenant', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        ...mockStudent,
        user: { ...mockStudent.user, institution_id: 'other-inst' },
      } as any);

      await expect(
        service.generate(userId, institutionId, dto),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.topic.findUnique).not.toHaveBeenCalled();
      expect(aiProviderServiceMock.completeStructured).not.toHaveBeenCalled();
    });

    it('should block AI call when token limit is reached', async () => {
      aiUsageServiceMock.hasAvailableTokens.mockResolvedValue(false);

      await expect(
        service.generate(userId, institutionId, dto),
      ).rejects.toThrow(ForbiddenException);
      expect(aiProviderServiceMock.completeStructured).not.toHaveBeenCalled();
    });

    it('should retry once and throw 502 when content is semantically invalid twice — invalid content is never persisted', async () => {
      // Mix errado: 5 MC (esperado 3 MC + 2 dissertativas)
      const invalidContent = {
        questions: ['q1', 'q2', 'q3', 'q4', 'q5'].map((id) => validMc(id)),
      };
      aiProviderServiceMock.completeStructured.mockResolvedValue({
        data: invalidContent,
        promptTokens: 10,
        responseTokens: 10,
      });

      await expect(
        service.generate(userId, institutionId, dto),
      ).rejects.toThrow(BadGatewayException);
      expect(aiProviderServiceMock.completeStructured).toHaveBeenCalledTimes(2);
      expect(prismaMock.exam.create).not.toHaveBeenCalled();
    });

    it('should check the token budget again before a structured-output retry', async () => {
      aiProviderServiceMock.completeStructured.mockResolvedValue({
        data: { questions: [] },
        promptTokens: 10,
        responseTokens: 10,
      });

      await expect(
        service.generate(userId, institutionId, dto),
      ).rejects.toThrow(BadGatewayException);

      expect(aiUsageServiceMock.hasAvailableTokens).toHaveBeenCalledTimes(2);
    });

    it('should succeed when the retry attempt returns valid content', async () => {
      aiProviderServiceMock.completeStructured
        .mockResolvedValueOnce({
          data: { questions: [] },
          promptTokens: 1,
          responseTokens: 1,
        })
        .mockResolvedValueOnce({
          data: mainContent,
          promptTokens: 100,
          responseTokens: 200,
        });

      const result = await service.generate(userId, institutionId, dto);
      expect(result.exam_id).toBe('exam-id-1');
    });

    it('should register usage for a truncated attempt before retrying', async () => {
      aiProviderServiceMock.completeStructured
        .mockRejectedValueOnce(new AIResponseTruncatedError(12, 4000))
        .mockResolvedValueOnce({
          data: mainContent,
          promptTokens: 100,
          responseTokens: 200,
        });

      await service.generate(userId, institutionId, dto);

      expect(aiUsageServiceMock.register).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          prompt_tokens: 12,
          response_tokens: 4000,
        }),
      );
      expect(aiUsageServiceMock.register).toHaveBeenCalledTimes(2);
    });

    it('should register AI usage after the generation call', async () => {
      await service.generate(userId, institutionId, dto);

      expect(aiUsageServiceMock.register).toHaveBeenCalledWith(
        expect.objectContaining({
          institution_id: institutionId,
          user_id: userId,
          provider: 'mock',
          model: 'mock-model',
          prompt_tokens: 100,
          response_tokens: 200,
        }),
      );
    });
  });

  // ─── Geração — retry ──────────────────────────────────────────────────────

  describe('generate (retry)', () => {
    // Exame de origem: q1 (MC) errada, q2/q3 (MC) certas, q4/q5 (essay) erradas
    const sourceAnswers: StudentAnswer[] = [
      {
        question_id: 'q1',
        selected_option_id: 'a',
        essay_text: null,
        verdict: 'incorrect',
        feedback: 'f1',
      },
      {
        question_id: 'q2',
        selected_option_id: 'b',
        essay_text: null,
        verdict: 'correct',
        feedback: 'f2',
      },
      {
        question_id: 'q3',
        selected_option_id: 'b',
        essay_text: null,
        verdict: 'correct',
        feedback: 'f3',
      },
      {
        question_id: 'q4',
        selected_option_id: null,
        essay_text: 'texto',
        verdict: 'incorrect',
        feedback: 'f4',
      },
      {
        question_id: 'q5',
        selected_option_id: null,
        essay_text: 'texto',
        verdict: 'incorrect',
        feedback: 'f5',
      },
    ];

    const sourceExam = {
      id: 'source-exam-1',
      student_id: studentId,
      subject_id: subjectId,
      topic_id: topicId,
      exam_type: 'main',
      exam_content_json: mainContent,
      student_answers_json: { answers: sourceAnswers },
      completed_at: new Date('2026-07-15T10:00:00Z'),
    };

    const dto = {
      topic_id: topicId,
      type: 'retry' as const,
      source_exam_id: 'source-exam-1',
    };

    // Mix das 3 primeiras erradas: q1 (MC), q4, q5 (essay) → 1 MC + 2 essay
    const retryContent: ExamContent = {
      questions: [validMc('r1'), validEssay('r2'), validEssay('r3')],
    };

    beforeEach(() => {
      prismaMock.exam.findUnique.mockResolvedValue(sourceExam as any);
      aiProviderServiceMock.completeStructured.mockResolvedValue({
        data: retryContent,
        promptTokens: 50,
        responseTokens: 80,
      });
      prismaMock.exam.create.mockResolvedValue({
        id: 'retry-exam-1',
        exam_content_json: retryContent,
      } as any);
    });

    it('should throw BadRequestException when source_exam_id is missing', async () => {
      await expect(
        service.generate(userId, institutionId, {
          topic_id: topicId,
          type: 'retry',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when source exam belongs to another student', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        ...sourceExam,
        student_id: 'other-student',
      } as any);

      await expect(
        service.generate(userId, institutionId, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when source exam is not completed', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        ...sourceExam,
        completed_at: null,
      } as any);

      await expect(
        service.generate(userId, institutionId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return 422 when the source exam has no missed questions', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        ...sourceExam,
        student_answers_json: {
          answers: sourceAnswers.map((answer) => ({
            ...answer,
            verdict: 'correct' as const,
          })),
        },
      } as any);

      await expect(
        service.generate(userId, institutionId, dto),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should generate n = min(missed, 3) questions preserving the type mix in original order', async () => {
      // 3 erradas (q1 MC, q4/q5 essay) → 1 MC + 2 essay
      await service.generate(userId, institutionId, dto);

      const call = aiProviderServiceMock.completeStructured.mock.calls[0][0];
      expect(call.system).toContain(
        'exactamente 1 pregunta(s) de opción múltiple',
      );
      expect(call.system).toContain('2 pregunta(s) de desarrollo');
      // Statements das erradas entram no prompt como conceitos a reforçar
      expect(call.system).toContain('¿Pregunta MC q1?');
      expect(call.system).toContain('Explica el concepto (q4)');

      // Query de embedding: concatenação dos statements das erradas
      expect(ragServiceMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          topK: 3,
          institutionId,
          query: expect.stringContaining('¿Pregunta MC q1?'),
        }),
      );
    });

    it('should persist exam_type retry and never persist source_exam_id', async () => {
      await service.generate(userId, institutionId, dto);

      const createArgs = prismaMock.exam.create.mock.calls[0][0];
      expect(createArgs.data.exam_type).toBe('retry');
      expect(createArgs.data).not.toHaveProperty('source_exam_id');
    });
  });

  // ─── Correção ─────────────────────────────────────────────────────────────

  describe('submitAnswers', () => {
    const examId = 'exam-id-1';
    const createdAt = new Date(Date.now() - 300_000); // iniciado há 5 min

    const pendingExam = {
      id: examId,
      student_id: studentId,
      subject_id: subjectId,
      topic_id: topicId,
      exam_type: 'main',
      exam_content_json: mainContent,
      student_answers_json: {},
      final_score: null,
      completed_at: null,
      created_at: createdAt,
    };

    // q1/q2 corretas, q3 errada; q4/q5 respondidas
    const answersDto = {
      answers: [
        { question_id: 'q1', selected_option_id: 'b' },
        { question_id: 'q2', selected_option_id: 'b' },
        { question_id: 'q3', selected_option_id: 'a' },
        { question_id: 'q4', essay_text: 'Respuesta de desarrollo 4' },
        { question_id: 'q5', essay_text: 'Respuesta de desarrollo 5' },
      ],
    };

    const correctionResults = {
      results: [
        { question_id: 'q1', verdict: 'correct', feedback: 'MC feedback 1' },
        { question_id: 'q2', verdict: 'correct', feedback: 'MC feedback 2' },
        { question_id: 'q3', verdict: 'incorrect', feedback: 'MC feedback 3' },
        { question_id: 'q4', verdict: 'correct', feedback: 'Essay feedback 4' },
        {
          question_id: 'q5',
          verdict: 'incorrect',
          feedback: 'Essay feedback 5',
        },
      ],
    };

    beforeEach(() => {
      prismaMock.exam.findUnique.mockResolvedValue(pendingExam as any);
      prismaMock.exam.update.mockResolvedValue({} as any);
      aiProviderServiceMock.completeStructured.mockResolvedValue({
        data: correctionResults,
        promptTokens: 80,
        responseTokens: 120,
      });
    });

    it('should persist raw student answers BEFORE the correction AI call', async () => {
      await service.submitAnswers(userId, institutionId, examId, answersDto);

      const firstUpdateOrder =
        prismaMock.exam.update.mock.invocationCallOrder[0];
      const aiCallOrder =
        aiProviderServiceMock.completeStructured.mock.invocationCallOrder[0];
      expect(firstUpdateOrder).toBeLessThan(aiCallOrder);

      // Primeiro update: respostas cruas, sem verdict/feedback
      const rawAnswers = (
        prismaMock.exam.update.mock.calls[0][0].data.student_answers_json as {
          answers: StudentAnswer[];
        }
      ).answers;
      expect(rawAnswers).toHaveLength(5);
      for (const answer of rawAnswers) {
        expect(answer.verdict).toBeNull();
        expect(answer.feedback).toBeNull();
      }
    });

    it('should correct MC in code and override the AI verdict for MC questions', async () => {
      // IA contradiz o gabarito: diz que q1 (correta) está incorreta
      aiProviderServiceMock.completeStructured.mockResolvedValue({
        data: {
          results: correctionResults.results.map((result) =>
            result.question_id === 'q1'
              ? { ...result, verdict: 'incorrect' }
              : result,
          ),
        },
        promptTokens: 80,
        responseTokens: 120,
      });

      const result = await service.submitAnswers(
        userId,
        institutionId,
        examId,
        answersDto,
      );

      const q1 = result.questions.find((question) => question.id === 'q1');
      expect(q1?.verdict).toBe('correct'); // código decide, não a IA
    });

    it('should mark blank essay as incorrect without sending it to the AI', async () => {
      const withBlankEssay = {
        answers: answersDto.answers.map((answer) =>
          answer.question_id === 'q5'
            ? { question_id: 'q5', essay_text: '   ' }
            : answer,
        ),
      };
      aiProviderServiceMock.completeStructured.mockResolvedValue({
        data: {
          results: correctionResults.results.filter(
            (result) => result.question_id !== 'q5',
          ),
        },
        promptTokens: 80,
        responseTokens: 120,
      });

      const result = await service.submitAnswers(
        userId,
        institutionId,
        examId,
        withBlankEssay,
      );

      const q5 = result.questions.find((question) => question.id === 'q5');
      expect(q5?.verdict).toBe('incorrect');
      expect(q5?.feedback).toBe(EXAM_BLANK_ESSAY_FEEDBACK);
      // A resposta em branco não vai para o prompt da IA
      const userContent =
        aiProviderServiceMock.completeStructured.mock.calls[0][0].messages[0]
          .content;
      expect(userContent).not.toContain('question_id: q5');
      expect(userContent).toContain('<respuesta_alumno question_id="q4">');
    });

    it('should parse capitalized enum "Correct" as correct', async () => {
      aiProviderServiceMock.completeStructured.mockResolvedValue({
        data: {
          results: correctionResults.results.map((result) =>
            result.question_id === 'q4'
              ? { ...result, verdict: 'Correct' }
              : result,
          ),
        },
        promptTokens: 80,
        responseTokens: 120,
      });

      const result = await service.submitAnswers(
        userId,
        institutionId,
        examId,
        answersDto,
      );

      const q4 = result.questions.find((question) => question.id === 'q4');
      expect(q4?.verdict).toBe('correct');
    });

    it('should compute final_score as count of correct and result_summary from the template with the student name', async () => {
      // q1, q2 (MC corretas) + q4 (essay correta) = 3 acertos
      const result = await service.submitAnswers(
        userId,
        institutionId,
        examId,
        answersDto,
      );

      expect(result.final_score).toBe(3);
      expect(result.total_questions).toBe(5);
      expect(result.result_summary).toContain('Ana');
      expect(result.execution_time).toBeGreaterThan(0);

      // Persistência final com score e completed_at
      const finalUpdate = prismaMock.exam.update.mock.calls[1][0];
      expect(finalUpdate.data.final_score).toBe(3);
      expect(finalUpdate.data.completed_at).toBeInstanceOf(Date);
    });

    it('should not lose student answers when the correction AI call fails', async () => {
      aiProviderServiceMock.completeStructured.mockRejectedValue(
        new Error('provider unavailable'),
      );

      await expect(
        service.submitAnswers(userId, institutionId, examId, answersDto),
      ).rejects.toThrow();

      // Respostas cruas persistidas; exame NÃO é concluído
      expect(prismaMock.exam.update).toHaveBeenCalledTimes(1);
      const rawUpdate = prismaMock.exam.update.mock.calls[0][0];
      expect(rawUpdate.data.student_answers_json).toBeDefined();
      expect(rawUpdate.data.completed_at).toBeUndefined();
    });

    it('should block the correction AI call when token limit is reached', async () => {
      aiUsageServiceMock.hasAvailableTokens.mockResolvedValue(false);

      await expect(
        service.submitAnswers(userId, institutionId, examId, answersDto),
      ).rejects.toThrow(ForbiddenException);
      expect(aiProviderServiceMock.completeStructured).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when not all questions are answered', async () => {
      await expect(
        service.submitAnswers(userId, institutionId, examId, {
          answers: answersDto.answers.slice(0, 3),
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.exam.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the exam is already completed', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        ...pendingExam,
        completed_at: new Date(),
      } as any);

      await expect(
        service.submitAnswers(userId, institutionId, examId, answersDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when the exam belongs to another student', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        ...pendingExam,
        student_id: 'other-student',
      } as any);

      await expect(
        service.submitAnswers(userId, institutionId, examId, answersDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update Student_Metrics and mark topic as completed on main exam', async () => {
      await service.submitAnswers(userId, institutionId, examId, answersDto);

      expect(studentMetricsServiceMock.updateAfterExam).toHaveBeenCalledWith(
        studentId,
        subjectId,
        expect.objectContaining({ examType: 'main' }),
      );
      expect(topicProgressServiceMock.markAsCompleted).toHaveBeenCalledWith(
        studentId,
        topicId,
      );
    });

    it('should NOT mark topic as completed on retry exam but still update metrics', async () => {
      // Retry de 3 questões: 1 MC + 2 essay
      const retryContent: ExamContent = {
        questions: [validMc('r1'), validEssay('r2'), validEssay('r3')],
      };
      prismaMock.exam.findUnique.mockResolvedValue({
        ...pendingExam,
        exam_type: 'retry',
        exam_content_json: retryContent,
      } as any);
      aiProviderServiceMock.completeStructured.mockResolvedValue({
        data: {
          results: [
            { question_id: 'r1', verdict: 'correct', feedback: 'f' },
            { question_id: 'r2', verdict: 'correct', feedback: 'f' },
            { question_id: 'r3', verdict: 'incorrect', feedback: 'f' },
          ],
        },
        promptTokens: 10,
        responseTokens: 10,
      });

      await service.submitAnswers(userId, institutionId, examId, {
        answers: [
          { question_id: 'r1', selected_option_id: 'b' },
          { question_id: 'r2', essay_text: 'texto' },
          { question_id: 'r3', essay_text: 'texto' },
        ],
      });

      expect(topicProgressServiceMock.markAsCompleted).not.toHaveBeenCalled();
      expect(studentMetricsServiceMock.updateAfterExam).toHaveBeenCalledWith(
        studentId,
        subjectId,
        expect.objectContaining({ examType: 'retry' }),
      );
    });

    it('should register AI usage after the correction call', async () => {
      await service.submitAnswers(userId, institutionId, examId, answersDto);

      expect(aiUsageServiceMock.register).toHaveBeenCalledWith(
        expect.objectContaining({
          institution_id: institutionId,
          user_id: userId,
          prompt_tokens: 80,
          response_tokens: 120,
        }),
      );
    });
  });

  // ─── Releitura ────────────────────────────────────────────────────────────

  describe('getResult', () => {
    const completedExam = {
      id: 'exam-id-1',
      student_id: studentId,
      subject_id: subjectId,
      topic_id: topicId,
      exam_type: 'main',
      exam_content_json: mainContent,
      student_answers_json: {
        answers: mainContent.questions.map((question) => ({
          question_id: question.id,
          selected_option_id: question.type === 'multiple_choice' ? 'b' : null,
          essay_text: question.type === 'essay' ? 'texto' : null,
          verdict: 'correct' as const,
          feedback: `Feedback de ${question.id}`,
        })),
      },
      final_score: 5,
      result_summary: '¡Excelente, Ana!',
      completed_at: new Date('2026-07-16T12:00:00Z'),
      execution_time: 300,
      created_at: new Date('2026-07-16T11:55:00Z'),
    };

    it('should return the persisted result without any AI call', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(completedExam as any);

      const result = await service.getResult(
        userId,
        institutionId,
        'exam-id-1',
      );

      expect(result.final_score).toBe(5);
      expect(result.questions).toHaveLength(5);
      expect(aiProviderServiceMock.completeStructured).not.toHaveBeenCalled();
      expect(ragServiceMock.search).not.toHaveBeenCalled();
      expect(JSON.stringify(result)).not.toContain('correct_option_id');
    });

    it('should throw BadRequestException when the exam is not completed yet', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        ...completedExam,
        completed_at: null,
      } as any);

      await expect(
        service.getResult(userId, institutionId, 'exam-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when the exam belongs to another student', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        ...completedExam,
        student_id: 'other-student',
      } as any);

      await expect(
        service.getResult(userId, institutionId, 'exam-id-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
