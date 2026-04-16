import { Test, TestingModule } from '@nestjs/testing';
import { StudentMetricsService } from './student-metrics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('StudentMetricsService', () => {
  let service: StudentMetricsService;
  let prismaMock: PrismaMock;

  const studentId = 'student-id-1';
  const subjectId = 'subject-id-1';

  const mockMetrics = {
    id: 'metrics-id-1',
    student_id: studentId,
    subject_id: subjectId,
    accuracy_rate: 0.75,
    total_time: 7200,
    attempts: 3,
  };

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

  describe('upsert', () => {
    it('should create metrics when not existing', async () => {
      prismaMock.studentMetrics.upsert.mockResolvedValue(mockMetrics as any);

      const result = await service.upsert(studentId, subjectId, {
        accuracy_rate: 0.75,
        total_time: 7200,
        attempts: 3,
      });

      expect(result.accuracy_rate).toBe(0.75);
    });

    it('should aggregate metrics by subject — not by topic (Student_Metrics is per subject)', async () => {
      prismaMock.studentMetrics.upsert.mockResolvedValue(mockMetrics as any);

      await service.upsert(studentId, subjectId, {
        accuracy_rate: 0.8,
        total_time: 3600,
        attempts: 1,
      });

      expect(prismaMock.studentMetrics.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id_subject_id: { student_id: studentId, subject_id: subjectId },
          }),
        }),
      );
    });
  });

  describe('updateAfterExam', () => {
    it('should update accuracy_rate and increment attempts after exam completion', async () => {
      prismaMock.studentMetrics.upsert.mockResolvedValue({
        ...mockMetrics,
        accuracy_rate: 0.85,
        attempts: 4,
      } as any);

      const result = await service.updateAfterExam(studentId, subjectId, {
        score: 8.5,
        executionTime: 1800,
      });

      expect(result.accuracy_rate).toBe(0.85);
      expect(result.attempts).toBe(4);
    });
  });

  describe('findByStudent', () => {
    it('should return all subject metrics for a student', async () => {
      prismaMock.studentMetrics.findMany.mockResolvedValue([mockMetrics] as any);

      const result = await service.findByStudent(studentId);

      expect(result).toHaveLength(1);
      expect(prismaMock.studentMetrics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ student_id: studentId }),
        }),
      );
    });
  });
});
