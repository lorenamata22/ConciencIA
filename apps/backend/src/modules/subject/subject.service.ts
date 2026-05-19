import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';

@Injectable()
export class SubjectService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByInstitution(institutionId: string) {
    return this.prisma.subject.findMany({
      where: { course: { institution_id: institutionId } },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        course: { select: { id: true, name: true } },
      },
    });
  }

  async create(institutionId: string, dto: CreateSubjectDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, institution_id: institutionId },
    });
    if (!course) throw new NotFoundException('Curso não encontrado ou não pertence à instituição');

    return this.prisma.subject.create({
      data: {
        course_id: dto.courseId,
        name: dto.name,
        description: dto.description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        course: { select: { id: true, name: true } },
      },
    });
  }

  async remove(institutionId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, course: { institution_id: institutionId } },
    });
    if (!subject) throw new NotFoundException('Asignatura não encontrada');

    await this.prisma.subject.delete({ where: { id: subjectId } });
    return { deleted: true };
  }
}
