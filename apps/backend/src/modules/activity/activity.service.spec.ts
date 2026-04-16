import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('ActivityService', () => {
  let service: ActivityService;
  let prismaMock: PrismaMock;

  const institutionId = 'inst-id-1';
  const teacherId = 'teacher-id-1';

  const mockActivity = {
    id: 'activity-id-1',
    institution_id: institutionId,
    teacher_id: teacherId,
    class_id: 'class-id-1',
    subject_id: 'subject-id-1',
    topic_id: null,
    title: 'Trabalho em grupo — Álgebra',
    description: 'Resolução de exercícios em grupo',
    start_date: new Date('2026-04-14'),
    end_date: new Date('2026-04-21'),
    activity_type: 'trabalho',
    created_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  describe('create', () => {
    it('should create activity with institution_id from JWT', async () => {
      prismaMock.activity.create.mockResolvedValue(mockActivity as any);

      const result = await service.create(
        {
          class_id: 'class-id-1',
          subject_id: 'subject-id-1',
          title: 'Trabalho em grupo',
          description: 'Resolução em grupo',
          start_date: new Date('2026-04-14'),
          end_date: new Date('2026-04-21'),
          activity_type: 'trabalho',
        },
        teacherId,
        institutionId,
      );

      expect(prismaMock.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institution_id: institutionId,
            teacher_id: teacherId,
          }),
        }),
      );
    });
  });

  describe('findByClass', () => {
    it('should return activities filtered by class and institution', async () => {
      prismaMock.activity.findMany.mockResolvedValue([mockActivity] as any);

      await service.findByClass('class-id-1', institutionId);

      expect(prismaMock.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            class_id: 'class-id-1',
            institution_id: institutionId,
          }),
        }),
      );
    });
  });

  describe('assignStudents', () => {
    it('should create StudentActivity records for each student in class', async () => {
      prismaMock.activity.findUnique.mockResolvedValue(mockActivity as any);
      prismaMock.studentClass.findMany.mockResolvedValue([
        { student_id: 'student-id-1' },
        { student_id: 'student-id-2' },
      ] as any);
      prismaMock.studentActivity.createMany.mockResolvedValue({ count: 2 } as any);

      await service.assignStudents('activity-id-1', 'class-id-1', institutionId);

      expect(prismaMock.studentActivity.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ activity_id: 'activity-id-1', status: 'pending' }),
          ]),
        }),
      );
    });
  });

  describe('updateStudentStatus', () => {
    it('should update student activity status to completed', async () => {
      prismaMock.studentActivity.update.mockResolvedValue({
        id: 'sa-id-1',
        activity_id: 'activity-id-1',
        student_id: 'student-id-1',
        status: 'completed',
        completed_at: new Date(),
      } as any);

      const result = await service.updateStudentStatus(
        'activity-id-1',
        'student-id-1',
        'completed',
      );

      expect(result.status).toBe('completed');
    });
  });
});
