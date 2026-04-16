import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CourseModuleService } from './course-module.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('CourseModuleService', () => {
  let service: CourseModuleService;
  let prismaMock: PrismaMock;

  const institutionId = 'inst-id-1';

  const mockModule = {
    id: 'module-id-1',
    subject_id: 'subject-id-1',
    name: 'Módulo 1 — Álgebra',
    order: 1,
    subject: {
      course: { institution_id: institutionId },
    },
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseModuleService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CourseModuleService>(CourseModuleService);
  });

  describe('create', () => {
    it('should create module when subject chain belongs to institution', async () => {
      prismaMock.subject.findUnique.mockResolvedValue({
        id: 'subject-id-1',
        course: { institution_id: institutionId },
      } as any);
      prismaMock.module.create.mockResolvedValue(mockModule as any);

      const result = await service.create(
        { subject_id: 'subject-id-1', name: 'Módulo 1', order: 1 },
        institutionId,
      );

      expect(result.id).toBe('module-id-1');
    });

    it('should throw ForbiddenException when subject belongs to different institution', async () => {
      prismaMock.subject.findUnique.mockResolvedValue({
        id: 'subject-id-1',
        course: { institution_id: 'outro-inst' },
      } as any);

      await expect(
        service.create({ subject_id: 'subject-id-1', name: 'Hack', order: 1 }, institutionId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should validate isolation via Module → Subject → Course → Institution chain', async () => {
      prismaMock.module.findUnique.mockResolvedValue(mockModule as any);

      const result = await service.findOne('module-id-1', institutionId);
      expect(result.id).toBe('module-id-1');
    });

    it('should throw ForbiddenException when module chain points to different institution', async () => {
      prismaMock.module.findUnique.mockResolvedValue({
        ...mockModule,
        subject: { course: { institution_id: 'outro-inst' } },
      } as any);

      await expect(service.findOne('module-id-1', institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when module does not exist', async () => {
      prismaMock.module.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente', institutionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySubject', () => {
    it('should return modules ordered by order field', async () => {
      const modules = [
        { ...mockModule, order: 1 },
        { ...mockModule, id: 'module-id-2', order: 2 },
      ];
      prismaMock.module.findMany.mockResolvedValue(modules as any);

      await service.findBySubject('subject-id-1', institutionId);

      expect(prismaMock.module.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.objectContaining({ order: 'asc' }),
        }),
      );
    });
  });
});
