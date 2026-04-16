import { Test, TestingModule } from '@nestjs/testing';
import { TopicProgressService } from './topic-progress.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('TopicProgressService', () => {
  let service: TopicProgressService;
  let prismaMock: PrismaMock;

  const mockProgress = {
    id: 'progress-id-1',
    student_id: 'student-id-1',
    topic_id: 'topic-id-1',
    status: 'in_progress',
    total_time: 0,
    updated_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicProgressService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TopicProgressService>(TopicProgressService);
  });

  describe('upsert', () => {
    it('should create progress record when it does not exist', async () => {
      prismaMock.topicProgress.upsert.mockResolvedValue(mockProgress as any);

      const result = await service.upsert('student-id-1', 'topic-id-1', 'in_progress');
      expect(result.status).toBe('in_progress');
    });

    it('should update existing progress record', async () => {
      const updated = { ...mockProgress, status: 'completed', total_time: 3600 };
      prismaMock.topicProgress.upsert.mockResolvedValue(updated as any);

      const result = await service.upsert('student-id-1', 'topic-id-1', 'completed', 3600);
      expect(result.status).toBe('completed');
    });
  });

  describe('markAsCompleted', () => {
    it('should mark topic as completed only when explicitly triggered (after exam)', async () => {
      prismaMock.topicProgress.upsert.mockResolvedValue({
        ...mockProgress,
        status: 'completed',
      } as any);

      const result = await service.markAsCompleted('student-id-1', 'topic-id-1');
      expect(result.status).toBe('completed');

      // Deve usar upsert para não perder dados se já existir
      expect(prismaMock.topicProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: 'completed' }),
          create: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });
  });

  describe('findByStudent', () => {
    it('should return all topic progress records for a student', async () => {
      prismaMock.topicProgress.findMany.mockResolvedValue([mockProgress] as any);

      const result = await service.findByStudent('student-id-1');
      expect(result).toHaveLength(1);
      expect(prismaMock.topicProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ student_id: 'student-id-1' }),
        }),
      );
    });
  });

  describe('getStudentProgressBySubject', () => {
    it('should return progress grouped by topics of a subject', async () => {
      prismaMock.topicProgress.findMany.mockResolvedValue([mockProgress] as any);

      const result = await service.getByStudentAndSubject('student-id-1', 'subject-id-1');
      expect(result).toHaveLength(1);
    });
  });
});
