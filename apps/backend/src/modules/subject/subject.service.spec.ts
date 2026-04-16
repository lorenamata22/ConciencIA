import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('SubjectService', () => {
  let service: SubjectService;
  let prismaMock: PrismaMock;

  const institutionId = 'inst-id-1';

  const mockSubject = {
    id: 'subject-id-1',
    course_id: 'course-id-1',
    name: 'Matemática',
    description: 'Álgebra e geometria',
    course: { institution_id: institutionId },
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<SubjectService>(SubjectService);
  });

  describe('create', () => {
    it('should create subject when course belongs to institution', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 'course-id-1',
        institution_id: institutionId,
      } as any);
      prismaMock.subject.create.mockResolvedValue(mockSubject as any);

      const result = await service.create(
        { course_id: 'course-id-1', name: 'Matemática', description: 'Álgebra' },
        institutionId,
      );

      expect(result.id).toBe('subject-id-1');
    });

    it('should throw ForbiddenException when course belongs to different institution', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 'course-id-1',
        institution_id: 'outro-inst',
      } as any);

      await expect(
        service.create({ course_id: 'course-id-1', name: 'Hack' }, institutionId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should validate institution_id via course chain (Subject → Course → Institution)', async () => {
      prismaMock.subject.findUnique.mockResolvedValue(mockSubject as any);

      const result = await service.findOne('subject-id-1', institutionId);
      expect(result.id).toBe('subject-id-1');
    });

    it('should throw ForbiddenException when subject chain points to different institution', async () => {
      prismaMock.subject.findUnique.mockResolvedValue({
        ...mockSubject,
        course: { institution_id: 'outro-inst' },
      } as any);

      await expect(service.findOne('subject-id-1', institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when subject does not exist', async () => {
      prismaMock.subject.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente', institutionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCourse', () => {
    it('should return subjects filtered by course and institution chain', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 'course-id-1',
        institution_id: institutionId,
      } as any);
      prismaMock.subject.findMany.mockResolvedValue([mockSubject] as any);

      const result = await service.findByCourse('course-id-1', institutionId);
      expect(result).toHaveLength(1);
    });
  });
});
