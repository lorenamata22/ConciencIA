import { Test, TestingModule } from '@nestjs/testing';
import { AlertRulesService } from './alert-rules.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';
import { AlertType, AlertLevel } from './alert.constants';

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

describe('AlertRulesService', () => {
  let service: AlertRulesService;
  let prisma: PrismaMock;

  const institutionId = 'inst-1';
  const studentId = 'student-1';
  const topicId = 'topic-1';
  const subjectId = 'subject-1';

  beforeEach(async () => {
    prisma = createPrismaMock();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AlertRulesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get<AlertRulesService>(AlertRulesService);

    // Defaults: sem alerta pré-existente, sem mensagens, tópico com título
    prisma.alert.findFirst.mockResolvedValue(null as any);
    prisma.alert.create.mockResolvedValue({} as any);
    prisma.alert.updateMany.mockResolvedValue({ count: 0 } as any);
    prisma.message.count.mockResolvedValue(0 as any);
    prisma.topic.findUnique.mockResolvedValue({ title: 'Fracciones' } as any);
    prisma.exam.findFirst.mockResolvedValue(null as any);
  });

  // ── DIFFICULTY (evento no submit) ───────────────────────────────────────

  describe('evaluateDifficulty', () => {
    const params = { studentId, topicId, subjectId, institutionId };

    it('should create DIFFICULTY alert when student has 2 exams on same topic with score <= 2', async () => {
      prisma.exam.findMany.mockResolvedValue([
        { final_score: 2 },
        { final_score: 1 },
      ] as any);

      await service.evaluateDifficulty(params);

      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: AlertType.DIFFICULTY,
            level: AlertLevel.MEDIUM,
            student_id: studentId,
            institution_id: institutionId,
            subject_id: subjectId,
            topic_id: topicId,
          }),
        }),
      );
    });

    it('should not create DIFFICULTY alert with only 1 exam attempt', async () => {
      prisma.exam.findMany.mockResolvedValue([{ final_score: 1 }] as any);

      await service.evaluateDifficulty(params);

      expect(prisma.alert.create).not.toHaveBeenCalled();
    });

    it('should set level high when student has 3 or more attempts on same topic', async () => {
      prisma.exam.findMany.mockResolvedValue([
        { final_score: 2 },
        { final_score: 1 },
        { final_score: 0 },
      ] as any);

      await service.evaluateDifficulty(params);

      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ level: AlertLevel.HIGH }),
        }),
      );
    });

    it('should set level high when student has more than 20 chat messages on the topic', async () => {
      prisma.exam.findMany.mockResolvedValue([
        { final_score: 2 },
        { final_score: 1 },
      ] as any);
      prisma.message.count.mockResolvedValue(21 as any);

      await service.evaluateDifficulty(params);

      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ level: AlertLevel.HIGH }),
        }),
      );
    });

    it('should auto-resolve DIFFICULTY alert when student scores 4 or higher on the topic', async () => {
      prisma.exam.findMany.mockResolvedValue([
        { final_score: 4 },
        { final_score: 1 },
      ] as any);

      await service.evaluateDifficulty(params);

      expect(prisma.alert.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            alert_type: AlertType.DIFFICULTY,
            topic_id: topicId,
            resolved: false,
          }),
          data: expect.objectContaining({
            resolved: true,
            resolved_by: null,
          }),
        }),
      );
      expect(prisma.alert.create).not.toHaveBeenCalled();
    });

    it('should leave resolved_by null when alert is auto-resolved', async () => {
      prisma.exam.findMany.mockResolvedValue([
        { final_score: 5 },
        { final_score: 1 },
      ] as any);

      await service.evaluateDifficulty(params);

      const call = prisma.alert.updateMany.mock.calls.find(
        ([arg]: any) => arg.where.alert_type === AlertType.DIFFICULTY,
      );
      expect(call).toBeDefined();
      expect((call as any)[0].data.resolved_by).toBeNull();
    });

    it('should not create duplicate alert when unresolved alert exists for same student, type, subject and topic', async () => {
      prisma.exam.findMany.mockResolvedValue([
        { final_score: 2 },
        { final_score: 1 },
      ] as any);
      prisma.alert.findFirst.mockResolvedValue({ id: 'existing' } as any);

      await service.evaluateDifficulty(params);

      expect(prisma.alert.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            alert_type: AlertType.DIFFICULTY,
            subject_id: subjectId,
            topic_id: topicId,
            resolved: false,
          }),
        }),
      );
      expect(prisma.alert.create).not.toHaveBeenCalled();
    });

    it('should update the existing unresolved alert with refreshed attempts/scores and level on a new attempt', async () => {
      // 3ª tentativa no mesmo tópico com um alerta já aberto (criado na 2ª):
      // a linha existente deve ser atualizada (attempts 3, level high), não duplicada.
      prisma.exam.findMany.mockResolvedValue([
        { final_score: 2 },
        { final_score: 1 },
        { final_score: 0 },
      ] as any);
      prisma.alert.findFirst.mockResolvedValue({ id: 'existing' } as any);

      await service.evaluateDifficulty(params);

      expect(prisma.alert.create).not.toHaveBeenCalled();
      expect(prisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing' },
          data: expect.objectContaining({
            level: AlertLevel.HIGH,
            metadata: expect.objectContaining({
              attempts: 3,
              scores: [0, 1, 2],
            }),
          }),
        }),
      );
    });
  });

  // ── Job diário (ausência) ───────────────────────────────────────────────

  describe('runDailyScan', () => {
    const withStudents = (students: any[]) =>
      prisma.student.findMany.mockResolvedValue(students as any);

    it('should filter students by institution_id from JWT', async () => {
      withStudents([]);

      await service.runDailyScan(institutionId);

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { institution_id: institutionId },
          }),
        }),
      );
    });

    it('should create INACTIVITY alert when cognitive_test_date is set and last_activity_at is older than 7 days', async () => {
      withStudents([
        {
          id: studentId,
          cognitive_test_date: daysAgo(30),
          last_activity_at: daysAgo(10),
          user: { created_at: daysAgo(60) },
        },
      ]);

      await service.runDailyScan(institutionId);

      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: AlertType.INACTIVITY,
            level: AlertLevel.MEDIUM,
            subject_id: null,
            topic_id: null,
          }),
        }),
      );
    });

    it('should set INACTIVITY level high above 14 days', async () => {
      withStudents([
        {
          id: studentId,
          cognitive_test_date: daysAgo(30),
          last_activity_at: daysAgo(20),
          user: { created_at: daysAgo(60) },
        },
      ]);

      await service.runDailyScan(institutionId);

      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: AlertType.INACTIVITY,
            level: AlertLevel.HIGH,
          }),
        }),
      );
    });

    it('should create NEVER_STARTED alert when cognitive_test_date is null and user registered more than 7 days ago', async () => {
      withStudents([
        {
          id: studentId,
          cognitive_test_date: null,
          last_activity_at: null,
          user: { created_at: daysAgo(10) },
        },
      ]);

      await service.runDailyScan(institutionId);

      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: AlertType.NEVER_STARTED,
            level: AlertLevel.HIGH,
          }),
        }),
      );
    });

    it('should not create NEVER_STARTED during the grace period', async () => {
      withStudents([
        {
          id: studentId,
          cognitive_test_date: null,
          last_activity_at: null,
          user: { created_at: daysAgo(3) },
        },
      ]);

      await service.runDailyScan(institutionId);

      expect(prisma.alert.create).not.toHaveBeenCalled();
    });

    it('should auto-resolve NEVER_STARTED alert when cognitive_test_date is filled', async () => {
      withStudents([
        {
          id: studentId,
          cognitive_test_date: daysAgo(1),
          last_activity_at: daysAgo(1),
          user: { created_at: daysAgo(60) },
        },
      ]);

      await service.runDailyScan(institutionId);

      expect(prisma.alert.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            alert_type: AlertType.NEVER_STARTED,
            resolved: false,
          }),
          data: expect.objectContaining({ resolved: true, resolved_by: null }),
        }),
      );
    });

    it('should create LOW_PARTICIPATION when student is active but has no completed exam in 21 days', async () => {
      withStudents([
        {
          id: studentId,
          cognitive_test_date: daysAgo(40),
          last_activity_at: daysAgo(2),
          user: { created_at: daysAgo(40) },
        },
      ]);
      prisma.exam.findFirst.mockResolvedValue(null as any); // nenhum exame concluído

      await service.runDailyScan(institutionId);

      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: AlertType.LOW_PARTICIPATION,
            level: AlertLevel.MEDIUM,
          }),
        }),
      );
    });

    it('should not create LOW_PARTICIPATION for student enrolled less than 30 days ago', async () => {
      withStudents([
        {
          id: studentId,
          cognitive_test_date: daysAgo(10),
          last_activity_at: daysAgo(2),
          user: { created_at: daysAgo(15) },
        },
      ]);

      await service.runDailyScan(institutionId);

      const lowPart = prisma.alert.create.mock.calls.find(
        ([arg]: any) => arg.data.alert_type === AlertType.LOW_PARTICIPATION,
      );
      expect(lowPart).toBeUndefined();
    });

    it('should not create INACTIVITY and LOW_PARTICIPATION for the same student', async () => {
      // Aluno ativo (2 dias) e matriculado há 40 dias, sem exame → só LOW_PARTICIPATION
      withStudents([
        {
          id: studentId,
          cognitive_test_date: daysAgo(40),
          last_activity_at: daysAgo(2),
          user: { created_at: daysAgo(40) },
        },
      ]);
      prisma.exam.findFirst.mockResolvedValue(null as any);

      await service.runDailyScan(institutionId);

      const types = prisma.alert.create.mock.calls.map(
        ([arg]: any) => arg.data.alert_type,
      );
      expect(types).toContain(AlertType.LOW_PARTICIPATION);
      expect(types).not.toContain(AlertType.INACTIVITY);
    });

    it('should not cross tenants when scanning', async () => {
      withStudents([]);

      await service.runDailyScan(institutionId);

      // Toda leitura de alunos é filtrada pela instituição
      const call = prisma.student.findMany.mock.calls[0][0] as any;
      expect(call.where.user.institution_id).toBe(institutionId);
    });
  });
});
