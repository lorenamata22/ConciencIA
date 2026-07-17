import { Test, TestingModule } from '@nestjs/testing';
import { StudentMetricsService } from './student-metrics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('StudentMetricsService', () => {
  let service: StudentMetricsService;
  let prismaMock: PrismaMock;

  const studentId = 'student-id-1';
  const subjectId = 'subject-id-1';

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentMetricsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<StudentMetricsService>(StudentMetricsService);
  });

  describe('updateAfterExam', () => {
    it('should recompute accuracy_rate from completed main exams and increment attempts/total_time on main exam', async () => {
      // Média de final_score dos exams main concluídos: 4 de 5 → accuracy 0.8
      prismaMock.exam.aggregate.mockResolvedValue({
        _avg: { final_score: 4 },
      } as any);
      prismaMock.studentMetrics.upsert.mockResolvedValue({} as any);

      await service.updateAfterExam(studentId, subjectId, {
        examType: 'main',
        executionTime: 300,
      });

      // accuracy_rate só considera exams main concluídos da subject
      expect(prismaMock.exam.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            subject_id: subjectId,
            exam_type: 'main',
            completed_at: { not: null },
          }),
        }),
      );

      // Student_Metrics é agregado por subject (chave composta)
      expect(prismaMock.studentMetrics.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            student_id_subject_id: {
              student_id: studentId,
              subject_id: subjectId,
            },
          },
          update: expect.objectContaining({
            accuracy_rate: 0.8,
            total_time: { increment: 300 },
            attempts: { increment: 1 },
          }),
          create: expect.objectContaining({
            student_id: studentId,
            subject_id: subjectId,
            accuracy_rate: 0.8,
            total_time: 300,
            attempts: 1,
          }),
        }),
      );
    });

    it('should not update accuracy_rate on retry exams (biased sample) but still update attempts and total_time', async () => {
      prismaMock.studentMetrics.upsert.mockResolvedValue({} as any);

      await service.updateAfterExam(studentId, subjectId, {
        examType: 'retry',
        executionTime: 120,
      });

      // Retry não recalcula accuracy — nem consulta os exams
      expect(prismaMock.exam.aggregate).not.toHaveBeenCalled();

      const upsertArgs = prismaMock.studentMetrics.upsert.mock.calls[0][0];
      expect(upsertArgs.update).not.toHaveProperty('accuracy_rate');
      expect(upsertArgs.update).toMatchObject({
        total_time: { increment: 120 },
        attempts: { increment: 1 },
      });
      expect(upsertArgs.create).toMatchObject({
        total_time: 120,
        attempts: 1,
        accuracy_rate: 0,
      });
    });
  });
});
