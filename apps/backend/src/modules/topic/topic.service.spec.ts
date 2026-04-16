import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TopicService } from './topic.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('TopicService', () => {
  let service: TopicService;
  let prismaMock: PrismaMock;

  const institutionId = 'inst-id-1';

  const mockTopic = {
    id: 'topic-id-1',
    module_id: 'module-id-1',
    title: 'Equações de 1º grau',
    description: 'Resolução de equações lineares',
    order: 1,
    module: {
      subject: {
        course: { institution_id: institutionId },
      },
    },
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TopicService>(TopicService);
  });

  describe('create', () => {
    it('should create topic when module chain belongs to institution', async () => {
      prismaMock.module.findUnique.mockResolvedValue({
        id: 'module-id-1',
        subject: { course: { institution_id: institutionId } },
      } as any);
      prismaMock.topic.create.mockResolvedValue(mockTopic as any);

      const result = await service.create(
        { module_id: 'module-id-1', title: 'Equações', description: 'Linear', order: 1 },
        institutionId,
      );

      expect(result.id).toBe('topic-id-1');
    });

    it('should throw ForbiddenException when module chain points to different institution', async () => {
      prismaMock.module.findUnique.mockResolvedValue({
        id: 'module-id-1',
        subject: { course: { institution_id: 'outro-inst' } },
      } as any);

      await expect(
        service.create({ module_id: 'module-id-1', title: 'Hack', order: 1 }, institutionId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should validate isolation via Topic → Module → Subject → Course → Institution chain', async () => {
      prismaMock.topic.findUnique.mockResolvedValue(mockTopic as any);

      const result = await service.findOne('topic-id-1', institutionId);
      expect(result.id).toBe('topic-id-1');
    });

    it('should throw ForbiddenException when topic chain points to different institution', async () => {
      prismaMock.topic.findUnique.mockResolvedValue({
        ...mockTopic,
        module: { subject: { course: { institution_id: 'outro-inst' } } },
      } as any);

      await expect(service.findOne('topic-id-1', institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when topic does not exist', async () => {
      prismaMock.topic.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente', institutionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByModule', () => {
    it('should return topics ordered by order field', async () => {
      prismaMock.topic.findMany.mockResolvedValue([mockTopic] as any);

      await service.findByModule('module-id-1', institutionId);

      expect(prismaMock.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.objectContaining({ order: 'asc' }),
        }),
      );
    });
  });
});
