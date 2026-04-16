import { Test, TestingModule } from '@nestjs/testing';
import { ExamService } from './exam.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('ExamService', () => {
  let service: ExamService;
  let prismaMock: PrismaMock;

  const studentId = 'student-id-1';

  const mockExam = {
    id: 'exam-id-1',
    student_id: studentId,
    subject_id: 'subject-id-1',
    topic_id: 'topic-id-1',
    exam_content_json: {},
    student_answers_json: {},
    final_score: null,
    execution_time: null,
    result_summary: null,
    completed_at: null,
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);
  });

  describe('create', () => {
    it('should create exam session for student with subject and topic', async () => {
      prismaMock.exam.create.mockResolvedValue(mockExam as any);

      const result = await service.create({
        student_id: studentId,
        subject_id: 'subject-id-1',
        topic_id: 'topic-id-1',
      });

      expect(result.id).toBe('exam-id-1');
      expect(result.topic_id).toBe('topic-id-1');
    });
  });

  describe('complete', () => {
    it('should save final_score, result_summary, execution_time and completed_at', async () => {
      const completedExam = {
        ...mockExam,
        final_score: 8.5,
        result_summary: 'Bom desempenho',
        execution_time: 720,
        completed_at: new Date(),
      };
      prismaMock.exam.update.mockResolvedValue(completedExam as any);

      const result = await service.complete('exam-id-1', {
        final_score: 8.5,
        result_summary: 'Bom desempenho',
        execution_time: 720,
        student_answers_json: { q1: 'resposta', q2: 'resposta' },
      });

      expect(result.final_score).toBe(8.5);
      expect(result.completed_at).toBeDefined();
    });
  });

  describe('detectExamComplete', () => {
    it('should return true when AI response contains [EXAM_COMPLETE] tag', () => {
      const aiResponse = 'Parabéns! Você concluiu o exame. [EXAM_COMPLETE]';
      const result = service.detectExamComplete(aiResponse);
      expect(result).toBe(true);
    });

    it('should return false when AI response does not contain [EXAM_COMPLETE] tag', () => {
      const aiResponse = 'Ótima resposta! Vamos para a próxima pergunta.';
      const result = service.detectExamComplete(aiResponse);
      expect(result).toBe(false);
    });

    it('should detect [EXAM_COMPLETE] regardless of surrounding text', () => {
      const variations = [
        '[EXAM_COMPLETE]',
        'Fim do exame [EXAM_COMPLETE] obrigado',
        'Score: 9/10 [EXAM_COMPLETE]\nResumo: ...',
      ];

      variations.forEach((text) => {
        expect(service.detectExamComplete(text)).toBe(true);
      });
    });
  });

  describe('calculateScore', () => {
    it('should calculate score based on 7 questions', async () => {
      const answers = { q1: 'a', q2: 'a', q3: 'a', q4: 'a', q5: 'a', q6: 'a', q7: 'a' };
      const score = await service.calculateScore(answers, {
        correctAnswers: 7,
        totalQuestions: 7,
      });

      expect(score).toBe(10);
    });

    it('should calculate proportional score for partial correctness', async () => {
      const score = await service.calculateScore({}, { correctAnswers: 5, totalQuestions: 7 });
      expect(score).toBeCloseTo(7.14, 1);
    });
  });

  describe('findByStudent', () => {
    it('should return exams filtered by student_id', async () => {
      prismaMock.exam.findMany.mockResolvedValue([mockExam] as any);

      const result = await service.findByStudent(studentId);

      expect(prismaMock.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ student_id: studentId }),
        }),
      );
    });
  });
});
