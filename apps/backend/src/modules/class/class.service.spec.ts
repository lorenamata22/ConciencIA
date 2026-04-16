import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClassService } from './class.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('ClassService', () => {
  let service: ClassService;
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

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ClassService>(ClassService);
  });

  describe('create', () => {
    it('should create class and auto-generate unique license_code', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 'course-id-1',
        institution_id: institutionId,
      } as any);
      prismaMock.class.create.mockResolvedValue(mockClass as any);

      const result = await service.create(
        { course_id: 'course-id-1', name: 'Turma A', year: 2026, period: '1' },
        institutionId,
      );

      expect(result.license_code).toBeDefined();
      expect(result.license_code.length).toBeGreaterThan(0);
    });

    it('should throw ForbiddenException when course belongs to different institution', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 'course-id-1',
        institution_id: 'outro-inst',
      } as any);

      await expect(
        service.create(
          { course_id: 'course-id-1', name: 'Turma A', year: 2026, period: '1' },
          institutionId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return class when it belongs to institution via course chain', async () => {
      prismaMock.class.findUnique.mockResolvedValue(mockClass as any);

      const result = await service.findOne('class-id-1', institutionId);
      expect(result.id).toBe('class-id-1');
    });

    it('should throw ForbiddenException when class belongs to different institution', async () => {
      prismaMock.class.findUnique.mockResolvedValue({
        ...mockClass,
        course: { institution_id: 'outro-inst' },
      } as any);

      await expect(service.findOne('class-id-1', institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when class does not exist', async () => {
      prismaMock.class.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente', institutionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByLicenseCode', () => {
    it('should return class when license_code is valid', async () => {
      prismaMock.class.findFirst.mockResolvedValue(mockClass as any);

      const result = await service.findByLicenseCode('ABC123');
      expect(result.id).toBe('class-id-1');
    });

    it('should return null when license_code does not exist', async () => {
      prismaMock.class.findFirst.mockResolvedValue(null);

      const result = await service.findByLicenseCode('INVALIDO');
      expect(result).toBeNull();
    });
  });

  describe('getStudents', () => {
    it('should return students of a class filtered by institution', async () => {
      prismaMock.class.findUnique.mockResolvedValue(mockClass as any);
      prismaMock.studentClass.findMany.mockResolvedValue([
        { student_id: 'student-id-1', student: { id: 'student-id-1' } },
      ] as any);

      const result = await service.getStudents('class-id-1', institutionId);
      expect(result).toHaveLength(1);
    });
  });
});
