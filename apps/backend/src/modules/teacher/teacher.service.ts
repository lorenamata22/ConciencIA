import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { generateAccessCode } from '../../common/utils/access-code';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateTeacherDto, institutionId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing)
      throw new ConflictException('Já existe um usuário com este e-mail');

    // Pré-cadastro: sem senha — o professor ativa a conta depois com o access_code
    const accessCode = generateAccessCode();

    const teacher = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          institution_id: institutionId,
          name: dto.name,
          email: dto.email,
          phone: dto.phone ?? null,
          access_code: accessCode,
          user_type: UserType.teacher,
        },
      });

      const created = await tx.teacher.create({ data: { user_id: user.id } });

      if (dto.subjectIds?.length > 0) {
        await tx.teacherSubject.createMany({
          data: dto.subjectIds.map((sid) => ({
            teacher_id: created.id,
            subject_id: sid,
          })),
          skipDuplicates: true,
        });
      }

      if (dto.classIds?.length > 0) {
        await tx.teacherClass.createMany({
          data: dto.classIds.map((cid) => ({
            teacher_id: created.id,
            class_id: cid,
          })),
          skipDuplicates: true,
        });
      }

      return {
        teacherId: created.id,
        userId: user.id,
        name: user.name,
        email: user.email,
      };
    });

    return { ...teacher, accessCode };
  }

  async findAllByInstitution(institutionId: string) {
    const teachers = await this.prisma.teacher.findMany({
      where: { user: { institution_id: institutionId } },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            access_code: true,
          },
        },
        teacherSubjects: {
          select: {
            subject: {
              select: {
                id: true,
                name: true,
                course: { select: { id: true, name: true } },
              },
            },
          },
        },
        teacherClasses: {
          select: {
            class: {
              select: {
                id: true,
                name: true,
                course: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return teachers.map((t) => ({
      id: t.id,
      userId: t.user.id,
      name: t.user.name,
      email: t.user.email,
      phone: t.user.phone,
      pendingActivation: t.user.access_code !== null,
      subjects: t.teacherSubjects.map((ts) => ts.subject),
      classes: t.teacherClasses.map((tc) => tc.class),
    }));
  }

  async findOne(userId: string, institutionId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            institution_id: true,
            access_code: true,
          },
        },
        teacherSubjects: {
          select: {
            subject: {
              select: {
                id: true,
                name: true,
                course: { select: { id: true, name: true } },
              },
            },
          },
        },
        teacherClasses: {
          select: {
            class: {
              select: {
                id: true,
                name: true,
                course: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!teacher) throw new NotFoundException('Professor não encontrado');
    if (teacher.user.institution_id !== institutionId)
      throw new ForbiddenException('Acesso negado');

    return {
      id: teacher.id,
      userId: teacher.user.id,
      name: teacher.user.name,
      email: teacher.user.email,
      phone: teacher.user.phone,
      accessCode: teacher.user.access_code,
      pendingActivation: teacher.user.access_code !== null,
      subjects: teacher.teacherSubjects.map((ts) => ts.subject),
      classes: teacher.teacherClasses.map((tc) => tc.class),
    };
  }

  async sendAccessEmail(userId: string, institutionId: string) {
    const teacher = await this.findOne(userId, institutionId);
    if (!teacher.accessCode) {
      throw new BadRequestException(
        'Usuário já ativou a conta — não há código de acesso para enviar.',
      );
    }
    await this.emailService.sendAccessInvite(
      teacher.email,
      teacher.name,
      teacher.accessCode,
      'teacher',
    );
    return { sent: true };
  }

  async regenerateAccessCode(userId: string, institutionId: string) {
    const teacher = await this.findOne(userId, institutionId);
    if (!teacher.pendingActivation) {
      throw new BadRequestException(
        'Usuário já ativou a conta — não é possível regenerar o código.',
      );
    }

    const accessCode = generateAccessCode();
    await this.prisma.user.update({
      where: { id: teacher.userId },
      data: { access_code: accessCode },
    });

    return { accessCode };
  }

  async update(userId: string, dto: UpdateTeacherDto, institutionId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { user_id: userId },
      include: { user: { select: { id: true, institution_id: true } } },
    });

    if (!teacher) throw new NotFoundException('Professor não encontrado');
    if (teacher.user.institution_id !== institutionId)
      throw new ForbiddenException('Acesso negado');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
        },
      });

      if (dto.subjectIds !== undefined) {
        await tx.teacherSubject.deleteMany({
          where: { teacher_id: teacher.id },
        });
        if (dto.subjectIds.length > 0) {
          await tx.teacherSubject.createMany({
            data: dto.subjectIds.map((sid) => ({
              teacher_id: teacher.id,
              subject_id: sid,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (dto.classIds !== undefined) {
        await tx.teacherClass.deleteMany({ where: { teacher_id: teacher.id } });
        if (dto.classIds.length > 0) {
          await tx.teacherClass.createMany({
            data: dto.classIds.map((cid) => ({
              teacher_id: teacher.id,
              class_id: cid,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    return this.findOne(userId, institutionId);
  }

  private async getTeacherIdOrThrow(userId: string): Promise<string> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException('Professor não encontrado');
    return teacher.id;
  }

  // Sem filtro institution_id: o professor é localizado pelo user_id exato do
  // JWT, e turmas/alunos são derivados transitivamente das próprias TeacherClass
  // do professor — não há parâmetro de tenant vindo do cliente para validar.
  async getDashboardStats(userId: string) {
    const teacherId = await this.getTeacherIdOrThrow(userId);

    const teacherClasses = await this.prisma.teacherClass.findMany({
      where: { teacher_id: teacherId },
      select: { class_id: true },
    });
    const classIds = teacherClasses.map((tc) => tc.class_id);

    const activeStudents = classIds.length
      ? await this.prisma.studentClass.findMany({
          where: { class_id: { in: classIds } },
          distinct: ['student_id'],
          select: { student_id: true },
        })
      : [];

    return {
      assignedClassesCount: classIds.length,
      activeStudentsCount: activeStudents.length,
      // Módulo de notas ainda não implementado — média fica null até GradeColumn/StudentGrade existirem
      averageGrade: null as number | null,
    };
  }

  // Turmas atribuídas ao professor via TeacherClass — usadas como CTAs na tela Clases/Alumnos
  async getMyClasses(userId: string) {
    const teacherId = await this.getTeacherIdOrThrow(userId);

    const teacherClasses = await this.prisma.teacherClass.findMany({
      where: { teacher_id: teacherId },
      select: {
        class: {
          select: {
            id: true,
            name: true,
            year: true,
            period: true,
            course: { select: { id: true, name: true } },
          },
        },
      },
    });

    return teacherClasses
      .map((tc) => tc.class)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Resumo de uma turma do professor: matérias que ele leciona nela (via TeacherSubject)
  // e a lista de alunos. Nota média, assistência, estado e alunos em risco ainda não têm
  // lógica implementada (grades/attendance/alertas não existem) — permanecem null.
  async getClassDetail(userId: string, classId: string) {
    const teacherId = await this.getTeacherIdOrThrow(userId);

    const teacherClass = await this.prisma.teacherClass.findUnique({
      where: { teacher_id_class_id: { teacher_id: teacherId, class_id: classId } },
    });
    if (!teacherClass)
      throw new ForbiddenException('Esta turma não está atribuída a este professor');

    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        year: true,
        period: true,
        course_id: true,
        course: { select: { id: true, name: true } },
      },
    });
    if (!klass) throw new NotFoundException('Turma não encontrada');

    const [studentCount, teacherSubjects, studentClasses] = await Promise.all([
      this.prisma.studentClass.count({ where: { class_id: classId } }),
      this.prisma.teacherSubject.findMany({
        where: { teacher_id: teacherId, subject: { course_id: klass.course_id } },
        select: { subject: { select: { id: true, name: true } } },
      }),
      this.prisma.studentClass.findMany({
        where: { class_id: classId },
        select: {
          student: {
            select: { id: true, user: { select: { id: true, name: true, email: true } } },
          },
        },
      }),
    ]);

    return {
      class: {
        id: klass.id,
        name: klass.name,
        year: klass.year,
        period: klass.period,
        course: klass.course,
      },
      subjects: teacherSubjects.map((ts) => ({
        id: ts.subject.id,
        name: ts.subject.name,
        studentCount,
        averageGrade: null as number | null,
        atRiskCount: null as number | null,
      })),
      students: studentClasses
        .map((sc) => ({
          id: sc.student.id,
          name: sc.student.user.name,
          email: sc.student.user.email,
          averageGrade: null as number | null,
          attendanceRate: null as number | null,
          status: null as string | null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  async remove(userId: string, institutionId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { user_id: userId },
      include: { user: { select: { id: true, institution_id: true } } },
    });

    if (!teacher) throw new NotFoundException('Professor não encontrado');
    if (teacher.user.institution_id !== institutionId)
      throw new ForbiddenException('Acesso negado');

    await this.prisma.$transaction(async (tx) => {
      await tx.teacherSubject.deleteMany({ where: { teacher_id: teacher.id } });
      await tx.teacherClass.deleteMany({ where: { teacher_id: teacher.id } });
      await tx.teacher.delete({ where: { id: teacher.id } });
      await tx.user.delete({ where: { id: userId } });
    });

    return { deleted: true };
  }
}
