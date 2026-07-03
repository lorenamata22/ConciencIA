import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('TeacherService', () => {
  let service: TeacherService;
  let prismaMock: PrismaMock;
  let emailServiceMock: { sendAccessInvite: jest.Mock };

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
      password: 'hashed' as string | null,
      access_code: null as string | null,
    },
    teacherSubjects: [],
    teacherClasses: [],
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    emailServiceMock = {
      sendAccessInvite: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailServiceMock },
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
            create: jest.fn().mockResolvedValue({
              id: mockTeacher.id,
              user_id: mockTeacher.user_id,
            }),
          },
          teacherSubject: { createMany: jest.fn() },
          teacherClass: { createMany: jest.fn() },
        });
      });

      const result = await service.create(
        {
          name: 'Professora Ana',
          email: 'ana@escola.com',
          subjectIds: [],
          classIds: [],
        },
        institutionId,
      );

      expect(result).toHaveProperty('accessCode');
      expect(result.accessCode).toHaveLength(8);
    });

    it('should create pre-registered user with access_code and without password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const userCreate = jest.fn().mockResolvedValue(mockTeacher.user);
      prismaMock.$transaction.mockImplementation(async (fn: any) =>
        fn({
          user: { create: userCreate },
          teacher: {
            create: jest.fn().mockResolvedValue({
              id: mockTeacher.id,
              user_id: mockTeacher.user_id,
            }),
          },
          teacherSubject: { createMany: jest.fn() },
          teacherClass: { createMany: jest.fn() },
        }),
      );

      await service.create(
        {
          name: 'Professora Ana',
          email: 'ana@escola.com',
          subjectIds: [],
          classIds: [],
        },
        institutionId,
      );

      const createData = userCreate.mock.calls[0][0].data;
      expect(createData.access_code).toHaveLength(8);
      expect(createData.password).toBeUndefined();
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

      await expect(
        service.findOne('teacher-id-1', institutionId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when teacher does not exist', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('id-inexistente', institutionId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update teacher name and phone', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue(mockTeacher as any);
      prismaMock.$transaction.mockImplementation(async (fn: any) =>
        fn(prismaMock),
      );
      prismaMock.user.update.mockResolvedValue({
        ...mockTeacher.user,
        name: 'Ana Nova',
      } as any);
      prismaMock.teacherSubject.deleteMany.mockResolvedValue({} as any);
      prismaMock.teacherClass.deleteMany.mockResolvedValue({} as any);
      prismaMock.teacher.findUnique.mockResolvedValueOnce(mockTeacher as any);

      await service.update('teacher-id-1', { name: 'Ana Nova' }, institutionId);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Ana Nova' }),
        }),
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

  describe('sendAccessEmail', () => {
    it('should send access invite email reading access_code from database', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue({
        ...mockTeacher,
        user: { ...mockTeacher.user, password: null, access_code: 'ABCD1234' },
      } as any);

      const result = await service.sendAccessEmail(
        'teacher-id-1',
        institutionId,
      );

      expect(emailServiceMock.sendAccessInvite).toHaveBeenCalledWith(
        mockTeacher.user.email,
        mockTeacher.user.name,
        'ABCD1234',
        'teacher',
      );
      expect(result).toEqual({ sent: true });
    });

    it('should throw BadRequestException when user is already active', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue({
        ...mockTeacher,
        user: { ...mockTeacher.user, access_code: null },
      } as any);

      await expect(
        service.sendAccessEmail('teacher-id-1', institutionId),
      ).rejects.toThrow(BadRequestException);
      expect(emailServiceMock.sendAccessInvite).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when teacher belongs to different institution', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue({
        ...mockTeacher,
        user: { ...mockTeacher.user, institution_id: 'outro-inst' },
      } as any);

      await expect(
        service.sendAccessEmail('teacher-id-1', institutionId),
      ).rejects.toThrow(ForbiddenException);
      expect(emailServiceMock.sendAccessInvite).not.toHaveBeenCalled();
    });
  });

  describe('regenerateAccessCode', () => {
    it('should generate a new access_code while account is pending', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue({
        ...mockTeacher,
        user: { ...mockTeacher.user, password: null, access_code: 'OLDCODE1' },
      } as any);
      prismaMock.user.update.mockResolvedValue(mockTeacher.user as any);

      const result = await service.regenerateAccessCode(
        'user-id-1',
        institutionId,
      );

      expect(result.accessCode).toHaveLength(8);
      expect(result.accessCode).not.toBe('OLDCODE1');
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id-1' },
          data: { access_code: result.accessCode },
        }),
      );
    });

    it('should throw BadRequestException when account is already active', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue({
        ...mockTeacher,
        user: { ...mockTeacher.user, access_code: null },
      } as any);

      await expect(
        service.regenerateAccessCode('user-id-1', institutionId),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  describe('getDashboardStats', () => {
    it('should throw NotFoundException when teacher does not exist for userId', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue(null);

      await expect(
        service.getDashboardStats('user-id-inexistente'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return assignedClassesCount matching the number of classes assigned to the teacher', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue({
        id: 'teacher-id-1',
      } as any);
      prismaMock.teacherClass.findMany.mockResolvedValue([
        { class_id: 'class-1' },
        { class_id: 'class-2' },
        { class_id: 'class-3' },
      ] as any);
      prismaMock.studentClass.findMany.mockResolvedValue([]);

      const result = await service.getDashboardStats('user-id-1');

      expect(result.assignedClassesCount).toBe(3);
    });

    it('should return activeStudentsCount as the distinct count of students across the teacher classes', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue({
        id: 'teacher-id-1',
      } as any);
      prismaMock.teacherClass.findMany.mockResolvedValue([
        { class_id: 'class-1' },
        { class_id: 'class-2' },
      ] as any);
      prismaMock.studentClass.findMany.mockResolvedValue([
        { student_id: 'student-1' },
        { student_id: 'student-2' },
      ] as any);

      const result = await service.getDashboardStats('user-id-1');

      expect(result.activeStudentsCount).toBe(2);
      expect(prismaMock.studentClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { class_id: { in: ['class-1', 'class-2'] } },
          distinct: ['student_id'],
        }),
      );
    });

    it('should return assignedClassesCount and activeStudentsCount as 0 when teacher has no classes', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue({
        id: 'teacher-id-1',
      } as any);
      prismaMock.teacherClass.findMany.mockResolvedValue([]);

      const result = await service.getDashboardStats('user-id-1');

      expect(result.assignedClassesCount).toBe(0);
      expect(result.activeStudentsCount).toBe(0);
      expect(prismaMock.studentClass.findMany).not.toHaveBeenCalled();
    });

    it('should always return averageGrade as null (grades module not implemented yet)', async () => {
      prismaMock.teacher.findUnique.mockResolvedValue({
        id: 'teacher-id-1',
      } as any);
      prismaMock.teacherClass.findMany.mockResolvedValue([]);

      const result = await service.getDashboardStats('user-id-1');

      expect(result.averageGrade).toBeNull();
    });
  });

  describe('findAllByInstitution — pendingActivation', () => {
    it('should include pendingActivation flag based on access_code', async () => {
      prismaMock.teacher.findMany.mockResolvedValue([
        {
          ...mockTeacher,
          user: {
            ...mockTeacher.user,
            password: null,
            access_code: 'ABCD1234',
          },
        },
        {
          ...mockTeacher,
          id: 'teacher-id-2',
          user: { ...mockTeacher.user, id: 'user-id-2', access_code: null },
        },
      ] as any);

      const result = await service.findAllByInstitution(institutionId);

      expect(result[0].pendingActivation).toBe(true);
      expect(result[1].pendingActivation).toBe(false);
    });
  });
});
