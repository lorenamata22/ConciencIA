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
