import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('TeacherService', () => {
  let service: TeacherService;
  let prismaMock: PrismaMock;

  const institutionId = 'inst-id-1';

  const mockTeacher = {
    id: 'teacher-id-1',
    user_id: 'user-id-1',
    user: {
      id: 'user-id-1',
      institution_id: institutionId,
      name: 'Professora Ana',
      email: 'ana@escola.com',
      user_type: 'teacher',
    },
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TeacherService>(TeacherService);
  });

  describe('create', () => {
    it('should create teacher with institution_id from JWT', async () => {
      prismaMock.user.create.mockResolvedValue(mockTeacher.user as any);
      prismaMock.teacher.create.mockResolvedValue(mockTeacher as any);

      const result = await service.create(
        { name: 'Professora Ana', email: 'ana@escola.com', password: 'senha123' },
        institutionId,
      );

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institution_id: institutionId }),
        }),
      );
    });
  });

  describe('findAllByInstitution', () => {
    it('should return teachers filtered by institution_id', async () => {
      prismaMock.teacher.findMany.mockResolvedValue([mockTeacher] as any);

      const result = await service.findAllByInstitution(institutionId);

      expect(result).toHaveLength(1);
      expect(prismaMock.teacher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { institution_id: institutionId },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return teacher when found and belongs to institution', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue(mockTeacher as any);

      const result = await service.findOne('teacher-id-1', institutionId);
      expect(result.id).toBe('teacher-id-1');
    });

    it('should throw ForbiddenException when teacher belongs to different institution', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue({
        ...mockTeacher,
        user: { ...mockTeacher.user, institution_id: 'outro-inst' },
      } as any);

      await expect(service.findOne('teacher-id-1', institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when teacher does not exist', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente', institutionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignToClass', () => {
    it('should assign teacher to class from same institution', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue(mockTeacher as any);
      prismaMock.class.findUnique.mockResolvedValue({
        id: 'class-id-1',
        course: { institution_id: institutionId },
      } as any);
      prismaMock.teacherClass.create.mockResolvedValue({} as any);

      await service.assignToClass('teacher-id-1', 'class-id-1', institutionId);
      expect(prismaMock.teacherClass.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when class belongs to different institution', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue(mockTeacher as any);
      prismaMock.class.findUnique.mockResolvedValue({
        id: 'class-id-1',
        course: { institution_id: 'outro-inst' },
      } as any);

      await expect(
        service.assignToClass('teacher-id-1', 'class-id-1', institutionId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
