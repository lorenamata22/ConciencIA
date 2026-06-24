import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';

@Injectable()
export class InstitutionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInstitutionDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Já existe um usuário com este e-mail');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const institution = await tx.institution.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          representative_name: dto.representativeName,
          address: dto.address,
          postal_code: dto.postalCode,
          country: dto.country,
          city: dto.city,
          ai_token_limit: dto.aiTokenLimit,
          subject_limit: dto.subjectLimit,
        },
      });

      await tx.user.create({
        data: {
          institution_id: institution.id,
          name: dto.representativeName,
          email: dto.email,
          password: hashedPassword,
          user_type: UserType.institution,
        },
      });

      return institution;
    });
  }

  async findAll() {
    return this.prisma.institution.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const institution = await this.prisma.institution.findUnique({ where: { id } });
    if (!institution) throw new NotFoundException('Instituição não encontrada');
    return institution;
  }

  async update(id: string, dto: UpdateInstitutionDto) {
    const institution = await this.prisma.institution.findUnique({ where: { id } });
    if (!institution) throw new NotFoundException('Instituição não encontrada');

    return this.prisma.institution.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.representativeName !== undefined && { representative_name: dto.representativeName }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.postalCode !== undefined && { postal_code: dto.postalCode }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.aiTokenLimit !== undefined && { ai_token_limit: dto.aiTokenLimit }),
        ...(dto.subjectLimit !== undefined && { subject_limit: dto.subjectLimit }),
      },
    });
  }

  async getUsers(id: string) {
    const institution = await this.prisma.institution.findUnique({ where: { id } });
    if (!institution) throw new NotFoundException('Instituição não encontrada');

    return this.prisma.user.findMany({
      where: { institution_id: id },
      select: {
        id: true,
        name: true,
        email: true,
        user_type: true,
        is_minor: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async remove(id: string) {
    const institution = await this.prisma.institution.findUnique({ where: { id } });
    if (!institution) throw new NotFoundException('Instituição não encontrada');

    await this.prisma.$transaction(async (tx) => {
      const userIds = (await tx.user.findMany({ where: { institution_id: id }, select: { id: true } })).map(u => u.id);
      const studentIds = (await tx.student.findMany({ where: { user_id: { in: userIds } }, select: { id: true } })).map(s => s.id);
      const teacherIds = (await tx.teacher.findMany({ where: { user_id: { in: userIds } }, select: { id: true } })).map(t => t.id);
      const courseIds = (await tx.course.findMany({ where: { institution_id: id }, select: { id: true } })).map(c => c.id);
      const subjectIds = (await tx.subject.findMany({ where: { course_id: { in: courseIds } }, select: { id: true } })).map(s => s.id);
      const classIds = (await tx.class.findMany({ where: { course_id: { in: courseIds } }, select: { id: true } })).map(c => c.id);
      const moduleIds = (await tx.module.findMany({ where: { subject_id: { in: subjectIds } }, select: { id: true } })).map(m => m.id);
      const conversationIds = (await tx.conversation.findMany({ where: { student_id: { in: studentIds } }, select: { id: true } })).map(c => c.id);
      const eventIds = (await tx.event.findMany({ where: { institution_id: id }, select: { id: true } })).map(e => e.id);
      const fileIds = (await tx.file.findMany({ where: { institution_id: id }, select: { id: true } })).map(f => f.id);
      const templateIds = (await tx.gradeTemplate.findMany({ where: { institution_id: id }, select: { id: true } })).map(t => t.id);

      await tx.studentGrade.deleteMany({ where: { student_id: { in: studentIds } } });
      await tx.eventClass.deleteMany({ where: { event_id: { in: eventIds } } });
      await tx.favorite.deleteMany({ where: { student_id: { in: studentIds } } });
      await tx.note.deleteMany({ where: { student_id: { in: studentIds } } });
      await tx.topicProgress.deleteMany({ where: { student_id: { in: studentIds } } });
      await tx.studentMetrics.deleteMany({ where: { student_id: { in: studentIds } } });
      await tx.exam.deleteMany({ where: { student_id: { in: studentIds } } });
      await tx.aIUsage.deleteMany({ where: { institution_id: id } });
      await tx.alert.deleteMany({ where: { institution_id: id } });
      await tx.conversationSummary.deleteMany({ where: { conversation_id: { in: conversationIds } } });
      await tx.message.deleteMany({ where: { conversation_id: { in: conversationIds } } });
      await tx.conversation.deleteMany({ where: { student_id: { in: studentIds } } });
      await tx.studentClass.deleteMany({ where: { class_id: { in: classIds } } });
      await tx.teacherClass.deleteMany({ where: { class_id: { in: classIds } } });
      await tx.teacherSubject.deleteMany({ where: { subject_id: { in: subjectIds } } });
      await tx.passwordResetToken.deleteMany({ where: { user_id: { in: userIds } } });
      await tx.student.deleteMany({ where: { user_id: { in: userIds } } });
      await tx.teacher.deleteMany({ where: { user_id: { in: userIds } } });
      await tx.user.deleteMany({ where: { institution_id: id } });
      await tx.embedding.deleteMany({ where: { file_id: { in: fileIds } } });
      await tx.file.deleteMany({ where: { institution_id: id } });
      await tx.event.deleteMany({ where: { institution_id: id } });
      await tx.gradeColumn.deleteMany({ where: { template_id: { in: templateIds } } });
      await tx.gradeTemplate.deleteMany({ where: { institution_id: id } });
      await tx.topic.deleteMany({ where: { module_id: { in: moduleIds } } });
      await tx.module.deleteMany({ where: { subject_id: { in: subjectIds } } });
      await tx.subject.deleteMany({ where: { course_id: { in: courseIds } } });
      await tx.class.deleteMany({ where: { course_id: { in: courseIds } } });
      await tx.course.deleteMany({ where: { institution_id: id } });
      await tx.institution.delete({ where: { id } });
    });

    return { deleted: true };
  }

  async deleteUser(institutionId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, institution_id: institutionId },
      include: {
        teacher: { select: { id: true } },
        student: { select: { id: true } },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    await this.prisma.$transaction(async (tx) => {
      if (user.teacher) {
        await tx.teacherSubject.deleteMany({ where: { teacher_id: user.teacher.id } });
        await tx.teacherClass.deleteMany({ where: { teacher_id: user.teacher.id } });
        await tx.teacher.delete({ where: { id: user.teacher.id } });
      }

      if (user.student) {
        await tx.studentGrade.deleteMany({ where: { student_id: user.student.id } });
        await tx.favorite.deleteMany({ where: { student_id: user.student.id } });
        await tx.note.deleteMany({ where: { student_id: user.student.id } });
        await tx.topicProgress.deleteMany({ where: { student_id: user.student.id } });
        await tx.studentMetrics.deleteMany({ where: { student_id: user.student.id } });
        await tx.exam.deleteMany({ where: { student_id: user.student.id } });
        await tx.studentClass.deleteMany({ where: { student_id: user.student.id } });
        await tx.student.delete({ where: { id: user.student.id } });
      }

      await tx.user.delete({ where: { id: userId } });
    });

    return { deleted: true };
  }

  async updateLogo(id: string, url: string) {
    const institution = await this.prisma.institution.findUnique({ where: { id } });
    if (!institution) throw new NotFoundException('Instituição não encontrada');

    return this.prisma.institution.update({
      where: { id },
      data: { logo_url: url },
    });
  }

  async getDetailStats(id: string) {
    const institution = await this.prisma.institution.findUnique({ where: { id } });
    if (!institution) throw new NotFoundException('Instituição não encontrada');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [tokenTotal, tokenMonth, totalUsers, totalSubjects, subjectsWithContent] =
      await Promise.all([
        this.prisma.aIUsage.aggregate({
          where: { institution_id: id },
          _sum: { prompt_tokens: true, response_tokens: true, cost: true },
        }),
        this.prisma.aIUsage.aggregate({
          where: { institution_id: id, created_at: { gte: startOfMonth } },
          _sum: { prompt_tokens: true, response_tokens: true, cost: true },
        }),
        this.prisma.user.count({ where: { institution_id: id } }),
        this.prisma.subject.count({ where: { course: { institution_id: id } } }),
        this.prisma.subject.count({
          where: {
            course: { institution_id: id },
            files: { some: { is_ai_context: true } },
          },
        }),
      ]);

    const usedTokens =
      (tokenTotal._sum.prompt_tokens ?? 0) + (tokenTotal._sum.response_tokens ?? 0);
    const tokenLimit = institution.ai_token_limit;
    const usagePercent =
      tokenLimit && tokenLimit > 0
        ? Math.min(100, Math.round((usedTokens / tokenLimit) * 100))
        : 0;

    const monthCost = tokenMonth._sum.cost ?? 0;
    const monthPrompt = tokenMonth._sum.prompt_tokens ?? 0;
    const monthResponse = tokenMonth._sum.response_tokens ?? 0;
    const monthTotal = monthPrompt + monthResponse;
    const inputCost = monthTotal > 0 ? monthCost * (monthPrompt / monthTotal) : 0;
    const outputCost = monthTotal > 0 ? monthCost * (monthResponse / monthTotal) : 0;

    return {
      tokenUsage: {
        usedTokens,
        remainingTokens: tokenLimit ? Math.max(0, tokenLimit - usedTokens) : null,
        tokenLimit,
        usagePercent,
        currentMonthCost: monthCost,
        inputTokensCost: inputCost,
        outputTokensCost: outputCost,
      },
      users: {
        total: totalUsers,
      },
      subjects: {
        total: totalSubjects,
        withContent: subjectsWithContent,
      },
    };
  }

  async getStats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, active, pending, newThisMonth] = await Promise.all([
      this.prisma.institution.count(),
      this.prisma.institution.count({ where: { status: 'active' } }),
      this.prisma.institution.count({ where: { status: 'pending' } }),
      this.prisma.institution.count({ where: { created_at: { gte: startOfMonth } } }),
    ]);

    return { total, active, pending, newThisMonth };
  }
}
