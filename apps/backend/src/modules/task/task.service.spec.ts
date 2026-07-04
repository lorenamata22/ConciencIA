import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('TaskService', () => {
  let service: TaskService;
  let prismaMock: PrismaMock;

  const userId = 'user-id-1';
  const teacherId = 'teacher-id-1';
  const institutionId = 'inst-id-1';
  const subjectId = 'subject-id-1';
  const classId = 'class-id-1';

  const mockTask = {
    id: 'task-id-1',
    institution_id: institutionId,
    teacher_id: teacherId,
    subject_id: subjectId,
    name: 'Teorema de Pitágoras',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);

    // Padrão: o user do JWT resolve para um teacher existente
    prismaMock.teacher.findUnique.mockResolvedValue({ id: teacherId } as any);
  });

  describe('create', () => {
    const dto = {
      name: 'Teorema de Pitágoras',
      subjectId,
      classIds: [classId],
    };

    it('should create task with institution_id and teacher_id from the authenticated teacher', async () => {
      prismaMock.teacherSubject.findUnique.mockResolvedValue({
        teacher_id: teacherId,
        subject_id: subjectId,
      } as any);
      prismaMock.teacherClass.findMany.mockResolvedValue([
        { class_id: classId },
      ] as any);
      prismaMock.task.create.mockResolvedValue(mockTask as any);

      await service.create(userId, institutionId, dto);

      expect(prismaMock.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institution_id: institutionId,
            teacher_id: teacherId,
            subject_id: subjectId,
            name: dto.name,
          }),
        }),
      );
    });

    it('should throw ForbiddenException when subject does not belong to the teacher', async () => {
      prismaMock.teacherSubject.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, institutionId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.task.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when a class does not belong to the teacher', async () => {
      prismaMock.teacherSubject.findUnique.mockResolvedValue({
        teacher_id: teacherId,
        subject_id: subjectId,
      } as any);
      // professor não leciona a turma pedida — retorna vazio
      prismaMock.teacherClass.findMany.mockResolvedValue([] as any);

      await expect(service.create(userId, institutionId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.task.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllByTeacher', () => {
    it('should return tasks filtered by teacher_id', async () => {
      prismaMock.task.findMany.mockResolvedValue([] as any);

      await service.findAllByTeacher(userId);

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teacher_id: teacherId }),
        }),
      );
    });

    it('should filter by subject_id when subjectId is provided', async () => {
      prismaMock.task.findMany.mockResolvedValue([] as any);

      await service.findAllByTeacher(userId, subjectId);

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teacher_id: teacherId,
            subject_id: subjectId,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const dto = { name: 'Novo nome', subjectId, classIds: [classId] };

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.update(userId, 'task-id-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when task belongs to another teacher', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        ...mockTask,
        teacher_id: 'other-teacher',
      } as any);

      await expect(service.update(userId, 'task-id-1', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException when task belongs to another teacher', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        ...mockTask,
        teacher_id: 'other-teacher',
      } as any);

      await expect(service.remove(userId, 'task-id-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.task.delete).not.toHaveBeenCalled();
    });

    it('should delete the task when owned by the teacher', async () => {
      prismaMock.task.findUnique.mockResolvedValue(mockTask as any);
      prismaMock.task.delete.mockResolvedValue(mockTask as any);

      await service.remove(userId, 'task-id-1');

      expect(prismaMock.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-id-1' },
      });
    });
  });

  describe('setGrade', () => {
    beforeEach(() => {
      prismaMock.task.findUnique.mockResolvedValue({
        ...mockTask,
        taskClasses: [{ class_id: classId }],
      } as any);
      prismaMock.studentClass.findFirst.mockResolvedValue({
        student_id: 'student-id-1',
        class_id: classId,
      } as any);
    });

    it('should upsert student grade by (task_id, student_id)', async () => {
      prismaMock.taskGrade.upsert.mockResolvedValue({
        id: 'grade-id-1',
        task_id: 'task-id-1',
        student_id: 'student-id-1',
        value: '9.5',
      } as any);

      const result = await service.setGrade(
        userId,
        'task-id-1',
        'student-id-1',
        '9.5',
      );

      expect(result.value).toBe('9.5');
      expect(prismaMock.taskGrade.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            task_id_student_id: {
              task_id: 'task-id-1',
              student_id: 'student-id-1',
            },
          },
        }),
      );
    });

    it('should throw ForbiddenException when task belongs to another teacher', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        ...mockTask,
        teacher_id: 'other-teacher',
        taskClasses: [{ class_id: classId }],
      } as any);

      await expect(
        service.setGrade(userId, 'task-id-1', 'student-id-1', '9.5'),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.taskGrade.upsert).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when student is not in any of the task classes', async () => {
      prismaMock.studentClass.findFirst.mockResolvedValue(null);

      await expect(
        service.setGrade(userId, 'task-id-1', 'student-id-1', '9.5'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.taskGrade.upsert).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when grade is out of the 0-10 range', async () => {
      await expect(
        service.setGrade(userId, 'task-id-1', 'student-id-1', '11'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.taskGrade.upsert).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when grade is not a valid number', async () => {
      await expect(
        service.setGrade(userId, 'task-id-1', 'student-id-1', 'abc'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.taskGrade.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getStudentGrades', () => {
    it('should return the teacher tasks for the class with the student grade value', async () => {
      prismaMock.task.findMany.mockResolvedValue([
        {
          id: 'task-id-1',
          name: 'Teorema de Pitágoras',
          subject_id: subjectId,
          subject: { name: 'Matemáticas' },
          taskGrades: [{ value: '8.5' }],
        },
      ] as any);

      const result = await service.getStudentGrades(
        userId,
        'student-id-1',
        classId,
      );

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teacher_id: teacherId,
            taskClasses: { some: { class_id: classId } },
          }),
        }),
      );
      expect(result).toEqual([
        {
          taskId: 'task-id-1',
          title: 'Teorema de Pitágoras',
          subjectId,
          subjectName: 'Matemáticas',
          grade: '8.5',
        },
      ]);
    });

    it('should return grade as null when the student has no grade for a task', async () => {
      prismaMock.task.findMany.mockResolvedValue([
        {
          id: 'task-id-1',
          name: 'Teorema de Pitágoras',
          subject_id: subjectId,
          subject: { name: 'Matemáticas' },
          taskGrades: [],
        },
      ] as any);

      const result = await service.getStudentGrades(
        userId,
        'student-id-1',
        classId,
      );

      expect(result[0].grade).toBeNull();
    });
  });
});
