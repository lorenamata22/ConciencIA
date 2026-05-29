import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StudentService } from './student.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('StudentService', () => {
  let service: StudentService;
  let prismaMock: PrismaMock;

  const institutionId = 'inst-id-1';

  const mockClass = {
    id: 'class-id-1',
    course_id: 'course-id-1',
    name: 'Turma A',
    year: 2026,
    period: '1',
    license_code: 'ABC123',
    course: { institution_id: institutionId },
  };

  const mockUser = {
    id: 'user-id-1',
    institution_id: institutionId,
    name: 'Pedro',
    email: 'pedro@email.com',
    password: 'hashed',
    user_type: 'student',
    ai_token_limit: null,
    is_minor: false,
    phone: null,
    created_at: new Date(),
  };

  const mockStudent = {
    id: 'student-id-1',
    user_id: 'user-id-1',
    cognitive_profile: null,
    cognitive_test_date: null,
    test_count: 0,
    user: mockUser,
    studentClasses: [],
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
  });

  describe('registerWithLicenseCode', () => {
    it('should register student when license_code is valid', async () => {
      prismaMock.class.findFirst.mockResolvedValue(mockClass as any);
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.$transaction.mockImplementation(async (fn: any) =>
        fn({
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          student: { create: jest.fn().mockResolvedValue(mockStudent) },
          studentClass: { create: jest.fn() },
        }),
      );

      const result = await service.registerWithLicenseCode({
        name: 'Pedro',
        email: 'pedro@email.com',
        password: 'senha123',
        license_code: 'ABC123',
        is_minor: false,
      });

      expect(result.id).toBe('user-id-1');
    });

    it('should throw BadRequestException when license_code is invalid', async () => {
      prismaMock.class.findFirst.mockResolvedValue(null);

      await expect(
        service.registerWithLicenseCode({
          name: 'Pedro',
          email: 'pedro@email.com',
          password: 'senha123',
          license_code: 'INVALIDO',
          is_minor: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should automatically assign institution_id from the class, never from client input', async () => {
      prismaMock.class.findFirst.mockResolvedValue(mockClass as any);
      prismaMock.user.findUnique.mockResolvedValue(null);
      const userCreate = jest.fn().mockResolvedValue(mockUser);
      prismaMock.$transaction.mockImplementation(async (fn: any) =>
        fn({
          user: { create: userCreate },
          student: { create: jest.fn().mockResolvedValue(mockStudent) },
          studentClass: { create: jest.fn() },
        }),
      );

      await service.registerWithLicenseCode({
        name: 'Pedro',
        email: 'pedro@email.com',
        password: 'senha123',
        license_code: 'ABC123',
        is_minor: false,
      });

      expect(userCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institution_id: institutionId }),
        }),
      );
    });
  });

  describe('submitCognitiveTest', () => {
    it('should save cognitive profile when test_count is below 3', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ ...mockStudent, test_count: 1 } as any);
      prismaMock.student.update.mockResolvedValue({
        ...mockStudent,
        test_count: 2,
        cognitive_profile: { style: 'visual' },
        cognitive_test_date: new Date(),
      } as any);

      const result = await service.submitCognitiveTest('student-id-1', { style: 'visual' });
      expect(result.cognitive_profile).toEqual({ style: 'visual' });
    });

    it('should throw ForbiddenException when student has reached 3 cognitive tests', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ ...mockStudent, test_count: 3 } as any);

      await expect(
        service.submitCognitiveTest('student-id-1', { style: 'visual' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should increment test_count after each cognitive test submission', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ ...mockStudent, test_count: 0 } as any);
      prismaMock.student.update.mockResolvedValue({ ...mockStudent, test_count: 1 } as any);

      await service.submitCognitiveTest('student-id-1', { style: 'kinesthetic' });

      expect(prismaMock.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ test_count: { increment: 1 } }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return student when found', async () => {
      prismaMock.student.findUnique.mockResolvedValue(mockStudent as any);

      const result = await service.findOne('student-id-1');
      expect(result.id).toBe('student-id-1');
    });

    it('should throw NotFoundException when student does not exist', async () => {
      prismaMock.student.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createByInstitution', () => {
    it('should create student with accessCode and assign to class', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.class.findFirst.mockResolvedValue(mockClass as any);
      prismaMock.$transaction.mockImplementation(async (fn: any) =>
        fn({
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          student: { create: jest.fn().mockResolvedValue(mockStudent) },
          studentClass: { create: jest.fn() },
        }),
      );

      const result = await service.createByInstitution(
        { name: 'Pedro', email: 'pedro@email.com', classId: 'class-id-1' },
        institutionId,
      );

      expect(result).toHaveProperty('accessCode');
      expect(result.accessCode).toHaveLength(8);
    });

    it('should throw NotFoundException when classId does not belong to institution', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.class.findFirst.mockResolvedValue(null);

      await expect(
        service.createByInstitution(
          { name: 'Pedro', email: 'pedro@email.com', classId: 'outro-class' },
          institutionId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneByUserId', () => {
    it('should return student when found and belongs to institution', async () => {
      prismaMock.student.findUnique.mockResolvedValue(mockStudent as any);

      const result = await service.findOneByUserId('user-id-1', institutionId);
      expect(result.userId).toBe('user-id-1');
    });

    it('should throw ForbiddenException when student belongs to different institution', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        ...mockStudent,
        user: { ...mockUser, institution_id: 'outro-inst' },
      } as any);

      await expect(service.findOneByUserId('user-id-1', institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
