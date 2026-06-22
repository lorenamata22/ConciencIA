import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: PrismaMock;

  const institutionId = 'inst-1';

  const institutionUser: JwtPayload = {
    userId: 'user-inst-1',
    institutionId,
    userType: 'institution',
  };
  const teacherUser: JwtPayload = {
    userId: 'user-teacher-1',
    institutionId,
    userType: 'teacher',
  };
  const studentUser: JwtPayload = {
    userId: 'user-student-1',
    institutionId,
    userType: 'student',
  };

  const mockEvent = {
    id: 'event-1',
    institution_id: institutionId,
    created_by: institutionUser.userId,
    audience_type: 'student',
    title: 'Exámenes Finales',
    description: null,
    start_date: new Date('2026-05-05T18:45:00.000Z'),
    end_date: new Date('2026-05-05T20:00:00.000Z'),
    event_type: 'general',
    subject_id: null,
    topic_id: null,
    created_at: new Date(),
    eventClasses: [{ class_id: 'class-1' }],
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get<CalendarService>(CalendarService);
  });

  describe('create', () => {
    it('should create event with institution_id from JWT and audience from dto (institution)', async () => {
      prisma.class.findMany.mockResolvedValue([{ id: 'class-1' }] as any);
      prisma.event.create.mockResolvedValue(mockEvent as any);

      await service.create(
        {
          audience_type: 'student',
          title: 'Exámenes Finales',
          start_date: '2026-05-05T18:45:00.000Z',
          end_date: '2026-05-05T20:00:00.000Z',
          class_ids: ['class-1'],
        } as any,
        institutionUser,
      );

      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institution_id: institutionId,
            created_by: institutionUser.userId,
            audience_type: 'student',
          }),
        }),
      );
    });

    it('should force audience_type=student when teacher creates', async () => {
      prisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        teacherClasses: [{ class_id: 'class-1' }],
      } as any);
      prisma.event.create.mockResolvedValue(mockEvent as any);

      await service.create(
        {
          audience_type: 'teacher',
          title: 'Entrega de trabalho',
          start_date: '2026-05-05T18:45:00.000Z',
          end_date: '2026-05-05T20:00:00.000Z',
          class_ids: ['class-1'],
        } as any,
        teacherUser,
      );

      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ audience_type: 'student' }),
        }),
      );
    });

    it('should throw ForbiddenException when teacher selects a class outside teacher_class', async () => {
      prisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        teacherClasses: [{ class_id: 'class-1' }],
      } as any);

      await expect(
        service.create(
          {
            title: 'Evento',
            start_date: '2026-05-05T18:45:00.000Z',
            end_date: '2026-05-05T20:00:00.000Z',
            class_ids: ['class-2'],
          } as any,
          teacherUser,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.event.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when audience=student and class_ids is empty', async () => {
      await expect(
        service.create(
          {
            audience_type: 'student',
            title: 'Evento',
            start_date: '2026-05-05T18:45:00.000Z',
            end_date: '2026-05-05T20:00:00.000Z',
            class_ids: [],
          } as any,
          institutionUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.event.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllForUser', () => {
    it('should return all institution events for an institution user', async () => {
      prisma.event.findMany.mockResolvedValue([mockEvent] as any);

      await service.findAllForUser(institutionUser);

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: institutionId }),
        }),
      );
    });

    it('should return teacher-audience plus student-audience of own classes for a teacher', async () => {
      prisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        teacherClasses: [{ class_id: 'class-1' }],
      } as any);
      prisma.event.findMany.mockResolvedValue([mockEvent] as any);

      await service.findAllForUser(teacherUser);

      const where = prisma.event.findMany.mock.calls[0][0]!.where as any;
      expect(where.institution_id).toBe(institutionId);
      expect(where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ audience_type: 'teacher' }),
          expect.objectContaining({
            audience_type: 'student',
            eventClasses: { some: { class_id: { in: ['class-1'] } } },
          }),
        ]),
      );
    });

    it('should return only student-audience events of enrolled classes for a student', async () => {
      prisma.student.findUnique.mockResolvedValue({
        studentClasses: [{ class_id: 'class-1' }],
      } as any);
      prisma.event.findMany.mockResolvedValue([mockEvent] as any);

      await service.findAllForUser(studentUser);

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            audience_type: 'student',
            eventClasses: { some: { class_id: { in: ['class-1'] } } },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the event belongs to another tenant', async () => {
      prisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        institution_id: 'other-inst',
      } as any);

      await expect(service.findOne('event-1', institutionUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException when a teacher updates an event created by another user', async () => {
      prisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        created_by: 'another-user',
      } as any);
      prisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        teacherClasses: [{ class_id: 'class-1' }],
      } as any);

      await expect(
        service.update('event-1', { title: 'X' } as any, teacherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow an institution to update any event of its institution', async () => {
      prisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        created_by: 'someone-else',
      } as any);
      prisma.event.update.mockResolvedValue({
        ...mockEvent,
        title: 'Atualizado',
      } as any);

      const result = await service.update(
        'event-1',
        { title: 'Atualizado' } as any,
        institutionUser,
      );

      expect(prisma.event.update).toHaveBeenCalled();
      expect(result.title).toBe('Atualizado');
    });
  });

  describe('remove', () => {
    it('should delete an event of its own institution', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent as any);
      prisma.event.delete.mockResolvedValue(mockEvent as any);

      await service.remove('event-1', institutionUser);

      expect(prisma.event.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'event-1' } }),
      );
    });
  });

  describe('findSelectableClasses', () => {
    it('should return all institution classes for an institution user', async () => {
      const classes = [
        { id: 'class-1', name: '1A', course: { name: 'Matemática' } },
        { id: 'class-2', name: '2B', course: { name: 'História' } },
      ];
      prisma.class.findMany.mockResolvedValue(classes as any);

      const result = await service.findSelectableClasses(institutionUser);

      expect(prisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { course: { institution_id: institutionId } },
        }),
      );
      expect(result).toEqual(classes);
    });

    it('should return only the teacher own classes for a teacher', async () => {
      prisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        teacherClasses: [{ class_id: 'class-1' }],
      } as any);
      const classes = [
        { id: 'class-1', name: '1A', course: { name: 'Matemática' } },
      ];
      prisma.class.findMany.mockResolvedValue(classes as any);

      const result = await service.findSelectableClasses(teacherUser);

      expect(prisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['class-1'] } },
        }),
      );
      expect(result).toEqual(classes);
    });
  });
});
