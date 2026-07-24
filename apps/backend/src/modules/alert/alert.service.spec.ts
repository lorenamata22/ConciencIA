import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AlertService } from './alert.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';
import { AlertType } from './alert.constants';

describe('AlertService', () => {
  let service: AlertService;
  let prisma: PrismaMock;

  const institutionId = 'inst-1';
  const studentId = 'student-1';

  const mockAlert = {
    id: 'alert-1',
    student_id: studentId,
    institution_id: institutionId,
    alert_type: AlertType.INACTIVITY,
    level: 'medium',
    description: 'inactivo',
    resolved: false,
    subject_id: null,
    topic_id: null,
    metadata: null,
    resolved_at: null,
    resolved_by: null,
    created_at: new Date(),
  };

  beforeEach(async () => {
    prisma = createPrismaMock();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [AlertService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get<AlertService>(AlertService);
  });

  describe('getRiskStudentIds', () => {
    it('should return risk student ids in a single query', async () => {
      prisma.alert.groupBy.mockResolvedValue([
        { student_id: 'a' },
        { student_id: 'b' },
      ] as any);

      const result = await service.getRiskStudentIds(
        ['a', 'b', 'c'],
        institutionId,
      );

      expect(result).toEqual(new Set(['a', 'b']));
      expect(prisma.alert.groupBy).toHaveBeenCalledTimes(1);
      expect(prisma.alert.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['student_id'],
          where: expect.objectContaining({
            institution_id: institutionId,
            student_id: { in: ['a', 'b', 'c'] },
            resolved: false,
          }),
        }),
      );
    });

    it('should return empty set when no unresolved alerts exist', async () => {
      prisma.alert.groupBy.mockResolvedValue([] as any);

      const result = await service.getRiskStudentIds([studentId], institutionId);

      expect(result).toEqual(new Set());
    });

    it('should return empty set without querying when studentIds is empty', async () => {
      const result = await service.getRiskStudentIds([], institutionId);

      expect(result).toEqual(new Set());
      expect(prisma.alert.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('findByStudent', () => {
    it('should filter alerts by institution_id from JWT', async () => {
      prisma.alert.findMany.mockResolvedValue([mockAlert] as any);

      const result = await service.findByStudent(studentId, institutionId, {
        resolved: false,
      });

      expect(result).toHaveLength(1);
      expect(prisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            institution_id: institutionId,
            resolved: false,
          }),
          orderBy: [{ level: 'desc' }, { created_at: 'desc' }],
        }),
      );
    });
  });

  describe('resolve', () => {
    it('should fill resolved_by with userId when teacher resolves manually', async () => {
      prisma.alert.findUnique.mockResolvedValue(mockAlert as any);
      prisma.alert.update.mockResolvedValue({
        ...mockAlert,
        resolved: true,
      } as any);

      await service.resolve('alert-1', 'teacher-user-1', institutionId);

      expect(prisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert-1' },
          data: expect.objectContaining({
            resolved: true,
            resolved_by: 'teacher-user-1',
          }),
        }),
      );
    });

    it('should return 403 when resolving alert from another institution', async () => {
      prisma.alert.findUnique.mockResolvedValue({
        ...mockAlert,
        institution_id: 'other-inst',
      } as any);

      await expect(
        service.resolve('alert-1', 'teacher-user-1', institutionId),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.alert.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when alert does not exist', async () => {
      prisma.alert.findUnique.mockResolvedValue(null as any);

      await expect(
        service.resolve('missing', 'teacher-user-1', institutionId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAlertsByTopic', () => {
    it('should aggregate unresolved DIFFICULTY alerts by topic for the class', async () => {
      prisma.studentClass.findMany.mockResolvedValue([
        { student_id: 'a' },
        { student_id: 'b' },
      ] as any);
      prisma.alert.groupBy.mockResolvedValue([
        { topic_id: 'topic-1', _count: { _all: 3 } },
      ] as any);
      prisma.topic.findMany.mockResolvedValue([
        { id: 'topic-1', title: 'Fracciones' },
      ] as any);

      const result = await service.getAlertsByTopic('class-1', institutionId);

      expect(result).toEqual([
        { topic_id: 'topic-1', topic_title: 'Fracciones', student_count: 3 },
      ]);
      expect(prisma.alert.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['topic_id'],
          where: expect.objectContaining({
            institution_id: institutionId,
            alert_type: AlertType.DIFFICULTY,
            resolved: false,
          }),
        }),
      );
    });

    it('should return empty array when class has no students', async () => {
      prisma.studentClass.findMany.mockResolvedValue([] as any);

      const result = await service.getAlertsByTopic('class-1', institutionId);

      expect(result).toEqual([]);
      expect(prisma.alert.groupBy).not.toHaveBeenCalled();
    });
  });
});
