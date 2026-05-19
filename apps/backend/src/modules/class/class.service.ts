import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

function generateLicenseCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

const CLASS_SELECT = {
  id: true,
  name: true,
  year: true,
  period: true,
  license_code: true,
  course: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByInstitution(institutionId: string) {
    return this.prisma.class.findMany({
      where: { course: { institution_id: institutionId } },
      orderBy: { name: 'asc' },
      select: CLASS_SELECT,
    });
  }

  async create(institutionId: string, dto: CreateClassDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, institution_id: institutionId },
    });
    if (!course) throw new NotFoundException('Curso não encontrado');

    let license_code: string;
    do {
      license_code = generateLicenseCode();
    } while (await this.prisma.class.findUnique({ where: { license_code } }));

    return this.prisma.class.create({
      data: {
        name: dto.name,
        course_id: dto.courseId,
        year: dto.year ?? new Date().getFullYear(),
        period: dto.period,
        license_code,
      },
      select: CLASS_SELECT,
    });
  }

  async update(institutionId: string, classId: string, dto: UpdateClassDto) {
    const existing = await this.prisma.class.findFirst({
      where: { id: classId, course: { institution_id: institutionId } },
    });
    if (!existing) throw new NotFoundException('Turma não encontrada');

    if (dto.courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, institution_id: institutionId },
      });
      if (!course) throw new NotFoundException('Curso não encontrado');
    }

    return this.prisma.class.update({
      where: { id: classId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.courseId && { course_id: dto.courseId }),
        ...(dto.year && { year: dto.year }),
        ...(dto.period && { period: dto.period }),
      },
      select: CLASS_SELECT,
    });
  }

  async remove(institutionId: string, classId: string) {
    const existing = await this.prisma.class.findFirst({
      where: { id: classId, course: { institution_id: institutionId } },
    });
    if (!existing) throw new NotFoundException('Turma não encontrada');

    await this.prisma.class.delete({ where: { id: classId } });
    return { deleted: true };
  }
}
