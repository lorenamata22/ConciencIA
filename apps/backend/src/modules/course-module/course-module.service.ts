import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';

// CRUD de módulos (agrupadores de tópicos dentro de uma matéria). Criados em
// lote pelo import do programa (§14) e editáveis avulso aqui. Isolamento por
// cadeia de JOIN (CLAUDE.md §5): Module → Subject → Course → institution_id.
@Injectable()
export class CourseModuleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseModuleDto, institutionId: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subject_id },
      include: { course: true },
    });
    if (!subject) throw new NotFoundException('Asignatura no encontrada');
    if (subject.course.institution_id !== institutionId) {
      throw new ForbiddenException(
        'La asignatura no pertenece a la institución',
      );
    }

    return this.prisma.module.create({
      data: {
        subject_id: dto.subject_id,
        name: dto.name,
        order: dto.order,
      },
    });
  }

  async findOne(id: string, institutionId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: { subject: { include: { course: true } } },
    });
    if (!module) throw new NotFoundException('Módulo no encontrado');
    if (module.subject.course.institution_id !== institutionId) {
      throw new ForbiddenException('El módulo no pertenece a la institución');
    }
    return module;
  }

  async findBySubject(subjectId: string, institutionId: string) {
    return this.prisma.module.findMany({
      where: {
        subject_id: subjectId,
        subject: { course: { institution_id: institutionId } },
      },
      orderBy: { order: 'asc' },
    });
  }
}
