import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';

@Injectable()
export class InstitutionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInstitutionDto) {
    return this.prisma.institution.create({
      data: {
        name: dto.name,
        ai_token_limit: dto.ai_token_limit,
      },
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
    return this.prisma.institution.update({
      where: { id },
      data: dto,
    });
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
