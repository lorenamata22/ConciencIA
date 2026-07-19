import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';

// CRUD de tópicos. Criados em lote pelo import do programa (§14); a ementa vai
// em Topic.description como contexto de escopo (§8). Isolamento por cadeia de
// JOIN (CLAUDE.md §5): Topic → Module → Subject → Course → institution_id.
@Injectable()
export class TopicService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTopicDto, institutionId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: dto.module_id },
      include: { subject: { include: { course: true } } },
    });
    if (!module) throw new NotFoundException('Módulo no encontrado');
    if (module.subject.course.institution_id !== institutionId) {
      throw new ForbiddenException('El módulo no pertenece a la institución');
    }

    return this.prisma.topic.create({
      data: {
        module_id: dto.module_id,
        title: dto.title,
        description: dto.description ?? null,
        order: dto.order,
      },
    });
  }

  async findOne(id: string, institutionId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        module: { include: { subject: { include: { course: true } } } },
      },
    });
    if (!topic) throw new NotFoundException('Tema no encontrado');
    if (topic.module.subject.course.institution_id !== institutionId) {
      throw new ForbiddenException('El tema no pertenece a la institución');
    }
    return topic;
  }

  // GET /topics?module_id=... — desbloqueia o dropdown "Temario" do Modo Exame
  async findByModule(moduleId: string, institutionId: string) {
    return this.prisma.topic.findMany({
      where: {
        module_id: moduleId,
        module: { subject: { course: { institution_id: institutionId } } },
      },
      orderBy: { order: 'asc' },
    });
  }
}
