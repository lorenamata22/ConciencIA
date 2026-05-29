import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeacherDto, institutionId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Já existe um usuário com este e-mail');

    const accessCode = generateAccessCode();
    const hashedPassword = await bcrypt.hash(accessCode, 10);

    const teacher = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          institution_id: institutionId,
          name: dto.name,
          email: dto.email,
          phone: dto.phone ?? null,
          password: hashedPassword,
          user_type: UserType.teacher,
        },
      });

      const created = await tx.teacher.create({ data: { user_id: user.id } });

      if (dto.subjectIds?.length > 0) {
        await tx.teacherSubject.createMany({
          data: dto.subjectIds.map((sid) => ({ teacher_id: created.id, subject_id: sid })),
          skipDuplicates: true,
        });
      }

      if (dto.classIds?.length > 0) {
        await tx.teacherClass.createMany({
          data: dto.classIds.map((cid) => ({ teacher_id: created.id, class_id: cid })),
          skipDuplicates: true,
        });
      }

      return { teacherId: created.id, userId: user.id, name: user.name, email: user.email };
    });

    return { ...teacher, accessCode };
  }

  async findAllByInstitution(institutionId: string) {
    const teachers = await this.prisma.teacher.findMany({
      where: { user: { institution_id: institutionId } },
      select: {
        id: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        teacherSubjects: {
          select: {
            subject: {
              select: { id: true, name: true, course: { select: { id: true, name: true } } },
            },
          },
        },
        teacherClasses: {
          select: {
            class: {
              select: { id: true, name: true, course: { select: { id: true, name: true } } },
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
          select: { id: true, name: true, email: true, phone: true, institution_id: true },
        },
        teacherSubjects: {
          select: {
            subject: {
              select: { id: true, name: true, course: { select: { id: true, name: true } } },
            },
          },
        },
        teacherClasses: {
          select: {
            class: {
              select: { id: true, name: true, course: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (!teacher) throw new NotFoundException('Professor não encontrado');
    if (teacher.user.institution_id !== institutionId) throw new ForbiddenException('Acesso negado');

    return {
      id: teacher.id,
      userId: teacher.user.id,
      name: teacher.user.name,
      email: teacher.user.email,
      phone: teacher.user.phone,
      subjects: teacher.teacherSubjects.map((ts) => ts.subject),
      classes: teacher.teacherClasses.map((tc) => tc.class),
    };
  }

  async update(userId: string, dto: UpdateTeacherDto, institutionId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { user_id: userId },
      include: { user: { select: { id: true, institution_id: true } } },
    });

    if (!teacher) throw new NotFoundException('Professor não encontrado');
    if (teacher.user.institution_id !== institutionId) throw new ForbiddenException('Acesso negado');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
        },
      });

      if (dto.subjectIds !== undefined) {
        await tx.teacherSubject.deleteMany({ where: { teacher_id: teacher.id } });
        if (dto.subjectIds.length > 0) {
          await tx.teacherSubject.createMany({
            data: dto.subjectIds.map((sid) => ({ teacher_id: teacher.id, subject_id: sid })),
            skipDuplicates: true,
          });
        }
      }

      if (dto.classIds !== undefined) {
        await tx.teacherClass.deleteMany({ where: { teacher_id: teacher.id } });
        if (dto.classIds.length > 0) {
          await tx.teacherClass.createMany({
            data: dto.classIds.map((cid) => ({ teacher_id: teacher.id, class_id: cid })),
            skipDuplicates: true,
          });
        }
      }
    });

    return this.findOne(userId, institutionId);
  }

  async remove(userId: string, institutionId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { user_id: userId },
      include: { user: { select: { id: true, institution_id: true } } },
    });

    if (!teacher) throw new NotFoundException('Professor não encontrado');
    if (teacher.user.institution_id !== institutionId) throw new ForbiddenException('Acesso negado');

    await this.prisma.$transaction(async (tx) => {
      await tx.teacherSubject.deleteMany({ where: { teacher_id: teacher.id } });
      await tx.teacherClass.deleteMany({ where: { teacher_id: teacher.id } });
      await tx.teacher.delete({ where: { id: teacher.id } });
      await tx.user.delete({ where: { id: userId } });
    });

    return { deleted: true };
  }
}
