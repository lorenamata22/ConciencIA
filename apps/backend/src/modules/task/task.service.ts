import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  // Localiza o teacher_id a partir do user_id do JWT
  private async getTeacherIdOrThrow(userId: string): Promise<string> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException('Professor não encontrado');
    return teacher.id;
  }

  // Garante que a matéria e todas as turmas pertencem ao professor
  private async assertOwnsSubjectAndClasses(
    teacherId: string,
    subjectId: string,
    classIds: string[],
  ) {
    const ownsSubject = await this.prisma.teacherSubject.findUnique({
      where: {
        teacher_id_subject_id: {
          teacher_id: teacherId,
          subject_id: subjectId,
        },
      },
    });
    if (!ownsSubject)
      throw new ForbiddenException('Esta matéria não pertence ao professor');

    const uniqueClassIds = [...new Set(classIds)];
    const ownedClasses = await this.prisma.teacherClass.findMany({
      where: { teacher_id: teacherId, class_id: { in: uniqueClassIds } },
      select: { class_id: true },
    });
    if (ownedClasses.length !== uniqueClassIds.length)
      throw new ForbiddenException('Alguma turma não pertence ao professor');
  }

  // Valida a nota: número entre 0 e 10 com no máximo 1 casa decimal; retorna normalizado ("9.5")
  private normalizeGrade(value: string): string {
    const trimmed = value.trim().replace(',', '.');
    if (!/^\d{1,2}(\.\d)?$/.test(trimmed))
      throw new BadRequestException(
        'La nota debe ser un número entre 0 y 10 con una decimal',
      );
    const num = Number(trimmed);
    if (Number.isNaN(num) || num < 0 || num > 10)
      throw new BadRequestException('La nota debe estar entre 0 y 10');
    return num.toFixed(1);
  }

  // Opções de matérias e turmas do professor — usadas nos dropdowns do formulário
  async getFormOptions(userId: string) {
    const teacherId = await this.getTeacherIdOrThrow(userId);

    const [teacherSubjects, teacherClasses] = await Promise.all([
      this.prisma.teacherSubject.findMany({
        where: { teacher_id: teacherId },
        select: { subject: { select: { id: true, name: true } } },
      }),
      this.prisma.teacherClass.findMany({
        where: { teacher_id: teacherId },
        select: { class: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      subjects: teacherSubjects
        .map((ts) => ts.subject)
        .sort((a, b) => a.name.localeCompare(b.name)),
      classes: teacherClasses
        .map((tc) => tc.class)
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  async findAllByTeacher(userId: string, subjectId?: string) {
    const teacherId = await this.getTeacherIdOrThrow(userId);

    const tasks = await this.prisma.task.findMany({
      where: {
        teacher_id: teacherId,
        ...(subjectId && { subject_id: subjectId }),
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        subject: { select: { id: true, name: true } },
        taskClasses: {
          select: { class: { select: { id: true, name: true } } },
        },
      },
    });

    return tasks.map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      classes: t.taskClasses.map((tc) => tc.class),
    }));
  }

  async findOne(userId: string, taskId: string) {
    const teacherId = await this.getTeacherIdOrThrow(userId);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        name: true,
        teacher_id: true,
        subject: { select: { id: true, name: true } },
        taskClasses: {
          select: { class: { select: { id: true, name: true } } },
        },
      },
    });

    if (!task) throw new NotFoundException('Tarea não encontrada');
    if (task.teacher_id !== teacherId)
      throw new ForbiddenException('Esta tarea não pertence ao professor');

    return {
      id: task.id,
      name: task.name,
      subject: task.subject,
      classes: task.taskClasses.map((tc) => tc.class),
    };
  }

  async create(userId: string, institutionId: string, dto: CreateTaskDto) {
    const teacherId = await this.getTeacherIdOrThrow(userId);
    await this.assertOwnsSubjectAndClasses(
      teacherId,
      dto.subjectId,
      dto.classIds,
    );

    const uniqueClassIds = [...new Set(dto.classIds)];

    return this.prisma.task.create({
      data: {
        institution_id: institutionId,
        teacher_id: teacherId,
        subject_id: dto.subjectId,
        name: dto.name,
        taskClasses: {
          create: uniqueClassIds.map((cid) => ({ class_id: cid })),
        },
      },
      select: { id: true, name: true },
    });
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const teacherId = await this.getTeacherIdOrThrow(userId);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, teacher_id: true },
    });
    if (!task) throw new NotFoundException('Tarea não encontrada');
    if (task.teacher_id !== teacherId)
      throw new ForbiddenException('Esta tarea não pertence ao professor');

    await this.assertOwnsSubjectAndClasses(
      teacherId,
      dto.subjectId,
      dto.classIds,
    );

    const uniqueClassIds = [...new Set(dto.classIds)];

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: { name: dto.name, subject_id: dto.subjectId },
      });
      await tx.taskClass.deleteMany({ where: { task_id: taskId } });
      await tx.taskClass.createMany({
        data: uniqueClassIds.map((cid) => ({
          task_id: taskId,
          class_id: cid,
        })),
        skipDuplicates: true,
      });
    });

    return this.findOne(userId, taskId);
  }

  async remove(userId: string, taskId: string) {
    const teacherId = await this.getTeacherIdOrThrow(userId);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, teacher_id: true },
    });
    if (!task) throw new NotFoundException('Tarea não encontrada');
    if (task.teacher_id !== teacherId)
      throw new ForbiddenException('Esta tarea não pertence ao professor');

    await this.prisma.task.delete({ where: { id: taskId } });
    return { deleted: true };
  }

  // Tareas do professor atribuídas a uma turma, com a nota do aluno (ou null)
  async getStudentGrades(userId: string, studentId: string, classId: string) {
    const teacherId = await this.getTeacherIdOrThrow(userId);

    const tasks = await this.prisma.task.findMany({
      where: {
        teacher_id: teacherId,
        taskClasses: { some: { class_id: classId } },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        subject_id: true,
        subject: { select: { name: true } },
        taskGrades: {
          where: { student_id: studentId },
          select: { value: true },
        },
      },
    });

    return tasks.map((t) => ({
      taskId: t.id,
      title: t.name,
      subjectId: t.subject_id,
      subjectName: t.subject.name,
      grade: t.taskGrades[0]?.value ?? null,
    }));
  }

  async setGrade(
    userId: string,
    taskId: string,
    studentId: string,
    value: string,
  ) {
    const teacherId = await this.getTeacherIdOrThrow(userId);
    const normalized = this.normalizeGrade(value);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        teacher_id: true,
        taskClasses: { select: { class_id: true } },
      },
    });
    if (!task) throw new NotFoundException('Tarea não encontrada');
    if (task.teacher_id !== teacherId)
      throw new ForbiddenException('Esta tarea não pertence ao professor');

    const classIds = task.taskClasses.map((tc) => tc.class_id);
    const enrollment = await this.prisma.studentClass.findFirst({
      where: { student_id: studentId, class_id: { in: classIds } },
    });
    if (!enrollment)
      throw new BadRequestException(
        'El alumno no pertenece a ninguna clase de esta tarea',
      );

    return this.prisma.taskGrade.upsert({
      where: {
        task_id_student_id: { task_id: taskId, student_id: studentId },
      },
      create: { task_id: taskId, student_id: studentId, value: normalized },
      update: { value: normalized },
      select: { id: true, task_id: true, student_id: true, value: true },
    });
  }
}
