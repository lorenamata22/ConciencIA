import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByInstitution(institutionId: string) {
    return this.prisma.course.findMany({
      where: { institution_id: institutionId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    });
  }

  async create(institutionId: string, dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        institution_id: institutionId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async remove(institutionId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, institution_id: institutionId },
    });
    if (!course) throw new NotFoundException('Curso não encontrado');

    await this.prisma.course.delete({ where: { id: courseId } });
    return { deleted: true };
  }
}
