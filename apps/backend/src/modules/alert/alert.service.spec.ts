import { Test, TestingModule } from '@nestjs/testing';
import { AlertService } from './alert.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('AlertService', () => {
  let service: AlertService;
  let prismaMock: PrismaMock;

  const institutionId = 'inst-id-1';
  const studentId = 'student-id-1';

  const mockAlert = {
    id: 'alert-id-1',
    student_id: studentId,
    institution_id: institutionId,
    alert_type: 'low_performance',
    level: 'warning',
    description: 'Aluno com taxa de acerto abaixo de 50%',
    resolved: false,
    created_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
  });

  describe('create', () => {
    it('should create alert with institution_id from JWT context', async () => {
      prismaMock.alert.create.mockResolvedValue(mockAlert as any);

      const result = await service.create({
        student_id: studentId,
        institution_id: institutionId,
        alert_type: 'low_performance',
        level: 'warning',
        description: 'Aluno com dificuldade',
      });

      expect(result.id).toBe('alert-id-1');
      expect(prismaMock.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institution_id: institutionId }),
        }),
      );
    });
  });

  describe('findByInstitution', () => {
    it('should return alerts filtered by institution_id', async () => {
      prismaMock.alert.findMany.mockResolvedValue([mockAlert] as any);

      const result = await service.findByInstitution(institutionId);

      expect(result).toHaveLength(1);
      expect(prismaMock.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: institutionId }),
        }),
      );
    });

    it('should return only unresolved alerts when filter is applied', async () => {
      prismaMock.alert.findMany.mockResolvedValue([mockAlert] as any);

      await service.findByInstitution(institutionId, { resolved: false });

      expect(prismaMock.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ resolved: false }),
        }),
      );
    });
  });

  describe('resolve', () => {
    it('should mark alert as resolved', async () => {
      prismaMock.alert.findUnique.mockResolvedValue(mockAlert as any);
      prismaMock.alert.update.mockResolvedValue({ ...mockAlert, resolved: true } as any);

      const result = await service.resolve('alert-id-1', institutionId);
      expect(result.resolved).toBe(true);
    });

    it('should throw ForbiddenException when alert belongs to different institution', async () => {
      const { ForbiddenException } = await import('@nestjs/common');
      prismaMock.alert.findUnique.mockResolvedValue({
        ...mockAlert,
        institution_id: 'outro-inst',
      } as any);

      await expect(service.resolve('alert-id-1', institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findByStudent', () => {
    it('should return alerts for a specific student', async () => {
      prismaMock.alert.findMany.mockResolvedValue([mockAlert] as any);

      const result = await service.findByStudent(studentId, institutionId);

      expect(prismaMock.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            institution_id: institutionId,
          }),
        }),
      );
    });
  });
});
