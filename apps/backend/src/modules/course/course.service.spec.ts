import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CourseService } from './course.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('CourseService', () => {
  let service: CourseService;
  let prismaMock: PrismaMock;

  const institutionId = 'inst-id-1';

  const mockCourse = {
    id: 'course-id-1',
    institution_id: institutionId,
    name: 'Ensino Médio',
    description: 'Curso de ensino médio',
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
  });

  describe('create', () => {
    it('should create course with institution_id from JWT', async () => {
      prismaMock.course.create.mockResolvedValue(mockCourse as any);

      await service.create({ name: 'Ensino Médio', description: 'Curso' }, institutionId);

      expect(prismaMock.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institution_id: institutionId }),
        }),
      );
    });
  });

  describe('findAllByInstitution', () => {
    it('should return courses filtered by institution_id', async () => {
      prismaMock.course.findMany.mockResolvedValue([mockCourse] as any);

      await service.findAllByInstitution(institutionId);

      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: institutionId }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return course when it belongs to the institution', async () => {
      prismaMock.course.findUnique.mockResolvedValue(mockCourse as any);

      const result = await service.findOne('course-id-1', institutionId);
      expect(result.id).toBe('course-id-1');
    });

    it('should throw ForbiddenException when course belongs to another institution', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        ...mockCourse,
        institution_id: 'outro-inst',
      } as any);

      await expect(service.findOne('course-id-1', institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when course does not exist', async () => {
      prismaMock.course.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente', institutionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update course from same institution', async () => {
      prismaMock.course.findUnique.mockResolvedValue(mockCourse as any);
      prismaMock.course.update.mockResolvedValue({ ...mockCourse, name: 'Novo Nome' } as any);

      const result = await service.update('course-id-1', { name: 'Novo Nome' }, institutionId);
      expect(result.name).toBe('Novo Nome');
    });

    it('should throw ForbiddenException when updating course from different institution', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        ...mockCourse,
        institution_id: 'outro-inst',
      } as any);

      await expect(
        service.update('course-id-1', { name: 'Hack' }, institutionId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete course from same institution', async () => {
      prismaMock.course.findUnique.mockResolvedValue(mockCourse as any);
      prismaMock.course.delete.mockResolvedValue(mockCourse as any);

      await service.remove('course-id-1', institutionId);
      expect(prismaMock.course.delete).toHaveBeenCalled();
    });
  });
});
