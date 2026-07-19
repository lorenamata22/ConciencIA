import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateSubjectWithModulesDto } from './dto/create-subject-with-modules.dto';
import { SyncSubjectStructureDto } from './dto/sync-subject-structure.dto';

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
        course: { select: { id: true, name: true } },
        files: {
          where: { document_type: DocumentType.main },
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { id: true, name: true, url: true, size: true },
        },
      },
    });
  }

  // Matérias do aluno via cadeia Subject → Course → Class → StudentClass →
  // Student.user_id — aluno só enxerga matérias dos cursos das turmas dele
  async findAllByStudent(userId: string) {
    return this.prisma.subject.findMany({
      where: {
        course: {
          classes: {
            some: {
              studentClasses: {
                some: { student: { user_id: userId } },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        course: { select: { id: true, name: true } },
      },
    });
  }

  // Leitura mínima para o Modo Exame: módulos servem apenas como agrupadores
  // visuais no dropdown; somente os tópicos são selecionáveis.
  async getExamOutlineForStudent(userId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        course: {
          classes: {
            some: {
              studentClasses: {
                some: { student: { user_id: userId } },
              },
            },
          },
        },
      },
      select: {
        modules: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            topics: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
              },
            },
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException(
        'Asignatura no encontrada o no disponible para el alumno',
      );
    }

    return subject.modules;
  }

  async create(institutionId: string, dto: CreateSubjectDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, institution_id: institutionId },
    });
    if (!course)
      throw new NotFoundException(
        'Curso não encontrado ou não pertence à instituição',
      );

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { subject_limit: true },
    });

    if (institution?.subject_limit != null) {
      const currentCount = await this.prisma.subject.count({
        where: { course: { institution_id: institutionId } },
      });
      if (currentCount >= institution.subject_limit) {
        throw new ForbiddenException(
          `Límite de asignaturas alcanzado (máximo ${institution.subject_limit})`,
        );
      }
    }

    return this.prisma.subject.create({
      data: {
        course_id: dto.courseId,
        name: dto.name,
      },
      select: {
        id: true,
        name: true,
        course: { select: { id: true, name: true } },
      },
    });
  }

  async update(
    institutionId: string,
    subjectId: string,
    dto: UpdateSubjectDto,
  ) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, course: { institution_id: institutionId } },
    });
    if (!subject) throw new NotFoundException('Asignatura não encontrada');

    if (dto.courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, institution_id: institutionId },
      });
      if (!course)
        throw new NotFoundException(
          'Curso não encontrado ou não pertence à instituição',
        );
    }

    return this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: dto.name,
        ...(dto.courseId && { course_id: dto.courseId }),
      },
      select: {
        id: true,
        name: true,
        course: { select: { id: true, name: true } },
      },
    });
  }

  // POST /subjects — criação a partir da estrutura já revisada pelo usuário no
  // import do programa (§14). Transacional: Subject + Modules + Topics inteiro,
  // ou nada. institution_id vem do JWT; revalida o course no tenant (não confia
  // no body). order de Module/Topic deriva do índice do array.
  async createWithModules(
    institutionId: string,
    dto: CreateSubjectWithModulesDto,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.course_id, institution_id: institutionId },
    });
    if (!course) {
      throw new ForbiddenException(
        'El curso no existe o no pertenece a la institución',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const subject = await tx.subject.create({
        data: { course_id: dto.course_id, name: dto.name },
      });

      for (let moduleIndex = 0; moduleIndex < dto.modules.length; moduleIndex++) {
        const moduleInput = dto.modules[moduleIndex];
        const createdModule = await tx.module.create({
          data: {
            subject_id: subject.id,
            name: moduleInput.name,
            order: moduleIndex,
          },
        });

        for (
          let topicIndex = 0;
          topicIndex < moduleInput.topics.length;
          topicIndex++
        ) {
          const topicInput = moduleInput.topics[topicIndex];
          await tx.topic.create({
            data: {
              module_id: createdModule.id,
              title: topicInput.title,
              description: topicInput.description ?? null,
              order: topicIndex,
            },
          });
        }
      }

      return tx.subject.findUnique({
        where: { id: subject.id },
        select: {
          id: true,
          name: true,
          course: { select: { id: true, name: true } },
          modules: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              name: true,
              order: true,
              topics: {
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  order: true,
                },
              },
            },
          },
        },
      });
    });
  }

  // Matéria + estrutura completa — alimenta a tela de edição da instituição
  async findOneWithStructure(institutionId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, course: { institution_id: institutionId } },
      select: {
        id: true,
        name: true,
        course: { select: { id: true, name: true } },
        modules: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            order: true,
            topics: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
              },
            },
          },
        },
      },
    });
    if (!subject) throw new NotFoundException('Asignatura no encontrada');
    return subject;
  }

  // Sincroniza a estrutura (módulos/tópicos) de uma matéria existente.
  //
  // Não é "apagar e recriar": Topic é referenciado por TopicProgress,
  // Conversation, Exam, File, Embedding e Event. O que tem `id` é atualizado
  // (preserva o histórico do aluno), o que não tem é criado, e o que sumiu do
  // payload só é removido se não tiver nenhum dado vinculado.
  async syncStructure(
    institutionId: string,
    subjectId: string,
    dto: SyncSubjectStructureDto,
  ) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, course: { institution_id: institutionId } },
      select: {
        id: true,
        modules: {
          select: { id: true, topics: { select: { id: true } } },
        },
      },
    });
    if (!subject) throw new NotFoundException('Asignatura no encontrada');

    const existingModuleIds = new Set(subject.modules.map((m) => m.id));
    const existingTopicIds = new Set(
      subject.modules.flatMap((m) => m.topics.map((t) => t.id)),
    );

    // Ids enviados têm de pertencer a ESTA matéria — impede que o cliente
    // sequestre módulo/tópico de outra matéria (ou de outro tenant) via body
    const sentModuleIds = dto.modules.flatMap((m) => (m.id ? [m.id] : []));
    const sentTopicIds = dto.modules.flatMap((m) =>
      m.topics.flatMap((t) => (t.id ? [t.id] : [])),
    );
    const foreign =
      sentModuleIds.some((id) => !existingModuleIds.has(id)) ||
      sentTopicIds.some((id) => !existingTopicIds.has(id));
    if (foreign) {
      throw new ForbiddenException(
        'La estructura enviada no pertenece a esta asignatura',
      );
    }

    const keptTopicIds = new Set(sentTopicIds);
    const removedTopicIds = [...existingTopicIds].filter(
      (id) => !keptTopicIds.has(id),
    );
    const keptModuleIds = new Set(sentModuleIds);
    const removedModuleIds = [...existingModuleIds].filter(
      (id) => !keptModuleIds.has(id),
    );

    await this.assertTopicsRemovable(removedTopicIds);

    return this.prisma.$transaction(async (tx) => {
      for (
        let moduleIndex = 0;
        moduleIndex < dto.modules.length;
        moduleIndex++
      ) {
        const moduleInput = dto.modules[moduleIndex];

        const moduleId = moduleInput.id
          ? ((await tx.module.update({
              where: { id: moduleInput.id },
              data: { name: moduleInput.name, order: moduleIndex },
            })) && moduleInput.id)
          : (
              await tx.module.create({
                data: {
                  subject_id: subjectId,
                  name: moduleInput.name,
                  order: moduleIndex,
                },
              })
            ).id;

        for (
          let topicIndex = 0;
          topicIndex < moduleInput.topics.length;
          topicIndex++
        ) {
          const topicInput = moduleInput.topics[topicIndex];
          const data = {
            title: topicInput.title,
            description: topicInput.description ?? null,
            order: topicIndex,
          };

          if (topicInput.id) {
            // module_id no update permite mover o tópico entre módulos
            await tx.topic.update({
              where: { id: topicInput.id },
              data: { ...data, module_id: moduleId },
            });
          } else {
            await tx.topic.create({ data: { ...data, module_id: moduleId } });
          }
        }
      }

      // Tópicos antes dos módulos: módulo com tópico ainda vinculado não sai
      for (const topicId of removedTopicIds) {
        await tx.topic.delete({ where: { id: topicId } });
      }
      for (const moduleId of removedModuleIds) {
        await tx.module.delete({ where: { id: moduleId } });
      }

      return tx.subject.findUnique({
        where: { id: subjectId },
        select: {
          id: true,
          name: true,
          modules: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              name: true,
              order: true,
              topics: {
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  order: true,
                },
              },
            },
          },
        },
      });
    });
  }

  // Um tópico só pode sumir se ninguém depende dele. Progresso, conversa,
  // prova, material e evento são dados que não podem ser destruídos por uma
  // edição de estrutura (§12).
  private async assertTopicsRemovable(topicIds: string[]) {
    if (topicIds.length === 0) return;

    const where = { topic_id: { in: topicIds } };
    const [progress, conversations, exams, files, events, embeddings] =
      await Promise.all([
        this.prisma.topicProgress.count({ where }),
        this.prisma.conversation.count({ where }),
        this.prisma.exam.count({ where }),
        this.prisma.file.count({ where }),
        this.prisma.event.count({ where }),
        this.prisma.embedding.count({ where }),
      ]);

    if (progress || conversations || exams || files || events || embeddings) {
      throw new ConflictException(
        'No se puede eliminar un tema que ya tiene progreso, conversaciones, exámenes o material asociado',
      );
    }
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
