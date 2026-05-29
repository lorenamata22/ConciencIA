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
      phone: null,
      user_type: 'teacher',
    },
    teacherSubjects: [],
    teacherClasses: [],
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
    it('should create teacher with institution_id from JWT and return accessCode', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          user: {
            create: jest.fn().mockResolvedValue(mockTeacher.user),
          },
          teacher: {
            create: jest.fn().mockResolvedValue({ id: mockTeacher.id, user_id: mockTeacher.user_id }),
          },
          teacherSubject: { createMany: jest.fn() },
          teacherClass: { createMany: jest.fn() },
        });
      });

      const result = await service.create(
        { name: 'Professora Ana', email: 'ana@escola.com', subjectIds: [], classIds: [] },
        institutionId,
      );

      expect(result).toHaveProperty('accessCode');
      expect(result.accessCode).toHaveLength(8);
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

  describe('update', () => {
    it('should update teacher name and phone', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue(mockTeacher as any);
      prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
      prismaMock.user.update.mockResolvedValue({ ...mockTeacher.user, name: 'Ana Nova' } as any);
      prismaMock.teacherSubject.deleteMany.mockResolvedValue({} as any);
      prismaMock.teacherClass.deleteMany.mockResolvedValue({} as any);
      prismaMock.teacher.findUnique.mockResolvedValueOnce(mockTeacher as any);

      await service.update('teacher-id-1', { name: 'Ana Nova' }, institutionId);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Ana Nova' }) }),
      );
    });

    it('should throw ForbiddenException when teacher belongs to different institution', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue({
        ...mockTeacher,
        user: { ...mockTeacher.user, institution_id: 'outro-inst' },
      } as any);

      await expect(
        service.update('teacher-id-1', { name: 'Nova' }, institutionId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
