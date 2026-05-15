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

  async deleteUser(institutionId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, institution_id: institutionId },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }

  async updateLogo(id: string, filename: string) {
    const institution = await this.prisma.institution.findUnique({ where: { id } });
    if (!institution) throw new NotFoundException('Instituição não encontrada');

    const port = process.env.BACKEND_PORT ?? '3001';
    const logoUrl = `http://localhost:${port}/uploads/logos/${filename}`;

    return this.prisma.institution.update({
      where: { id },
      data: { logo_url: logoUrl },
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
