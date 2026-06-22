import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AudienceType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const EVENT_INCLUDE = {
  eventClasses: { select: { class_id: true } },
} as const;

interface DateRange {
  from?: string;
  to?: string;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista eventos visíveis ao usuário conforme o papel (multi-tenant por JWT)
  async findAllForUser(user: JwtPayload, range?: DateRange) {
    const where = await this.buildVisibilityWhere(user);

    const dateFilter = this.buildDateFilter(range);
    if (dateFilter) Object.assign(where, dateFilter);

    return this.prisma.event.findMany({
      where,
      include: EVENT_INCLUDE,
      orderBy: { start_date: 'asc' },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: EVENT_INCLUDE,
    });

    // Fora do tenant ou inexistente → 404 (não vaza dados de outra instituição)
    if (!event || event.institution_id !== user.institutionId) {
      throw new NotFoundException('Evento não encontrado');
    }

    await this.assertVisible(event, user);
    return event;
  }

  async create(dto: CreateEventDto, user: JwtPayload) {
    const audience = this.resolveAudience(dto.audience_type, user);
    const classIds = dto.class_ids ?? [];

    if (audience === AudienceType.student && classIds.length === 0) {
      throw new BadRequestException(
        'Selecione ao menos uma turma para um evento de aluno',
      );
    }

    await this.assertClassesAllowed(classIds, user);

    return this.prisma.event.create({
      data: {
        institution_id: user.institutionId,
        created_by: user.userId,
        audience_type: audience,
        title: dto.title,
        description: dto.description ?? null,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        ...(dto.event_type ? { event_type: dto.event_type } : {}),
        subject_id: dto.subject_id ?? null,
        topic_id: dto.topic_id ?? null,
        eventClasses: { create: classIds.map((class_id) => ({ class_id })) },
      },
      include: EVENT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateEventDto, user: JwtPayload) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: EVENT_INCLUDE,
    });

    if (!event || event.institution_id !== user.institutionId) {
      throw new NotFoundException('Evento não encontrado');
    }

    // Professor só edita os eventos que ele criou
    if (user.userType === 'teacher' && event.created_by !== user.userId) {
      throw new ForbiddenException('Você não pode editar este evento');
    }

    const audience =
      dto.audience_type !== undefined
        ? this.resolveAudience(dto.audience_type, user)
        : event.audience_type;

    let classUpdate: Prisma.EventUpdateInput['eventClasses'];
    if (dto.class_ids !== undefined) {
      if (audience === AudienceType.student && dto.class_ids.length === 0) {
        throw new BadRequestException(
          'Selecione ao menos uma turma para um evento de aluno',
        );
      }
      await this.assertClassesAllowed(dto.class_ids, user);
      classUpdate = {
        deleteMany: {},
        create: dto.class_ids.map((class_id) => ({ class_id })),
      };
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.audience_type !== undefined && { audience_type: audience }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.start_date !== undefined && {
          start_date: new Date(dto.start_date),
        }),
        ...(dto.end_date !== undefined && { end_date: new Date(dto.end_date) }),
        ...(dto.event_type !== undefined && { event_type: dto.event_type }),
        ...(dto.subject_id !== undefined && { subject_id: dto.subject_id }),
        ...(dto.topic_id !== undefined && { topic_id: dto.topic_id }),
        ...(classUpdate ? { eventClasses: classUpdate } : {}),
      },
      include: EVENT_INCLUDE,
    });
  }

  async remove(id: string, user: JwtPayload) {
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event || event.institution_id !== user.institutionId) {
      throw new NotFoundException('Evento não encontrado');
    }

    if (user.userType === 'teacher' && event.created_by !== user.userId) {
      throw new ForbiddenException('Você não pode excluir este evento');
    }

    await this.prisma.event.delete({ where: { id } });
    return { deleted: true };
  }

  // Lista as turmas que o usuário pode selecionar ao criar/editar um evento
  async findSelectableClasses(user: JwtPayload) {
    const select = {
      id: true,
      name: true,
      course: { select: { name: true } },
    } as const;

    if (user.userType === 'institution' || user.userType === 'super_admin') {
      // Instituição: todas as turmas da própria instituição (via Course)
      return this.prisma.class.findMany({
        where: { course: { institution_id: user.institutionId } },
        select,
        orderBy: { name: 'asc' },
      });
    }

    // Professor: somente as turmas vinculadas a ele
    const classIds = await this.teacherClassIds(user.userId);
    return this.prisma.class.findMany({
      where: { id: { in: classIds } },
      select,
      orderBy: { name: 'asc' },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  // Professor sempre cria/edita eventos de aluno; instituição escolhe a audiência
  private resolveAudience(
    audience: AudienceType | undefined,
    user: JwtPayload,
  ): AudienceType {
    if (user.userType === 'teacher') return AudienceType.student;
    return audience ?? AudienceType.student;
  }

  // Monta o filtro de visibilidade por papel
  private async buildVisibilityWhere(
    user: JwtPayload,
  ): Promise<Prisma.EventWhereInput> {
    const base: Prisma.EventWhereInput = {
      institution_id: user.institutionId,
    };

    if (user.userType === 'institution' || user.userType === 'super_admin') {
      return base;
    }

    if (user.userType === 'teacher') {
      const classIds = await this.teacherClassIds(user.userId);
      return {
        ...base,
        OR: [
          { audience_type: AudienceType.teacher },
          {
            audience_type: AudienceType.student,
            eventClasses: { some: { class_id: { in: classIds } } },
          },
        ],
      };
    }

    // student
    const classIds = await this.studentClassIds(user.userId);
    return {
      ...base,
      audience_type: AudienceType.student,
      eventClasses: { some: { class_id: { in: classIds } } },
    };
  }

  // Garante que o evento já carregado é visível ao papel (usado no findOne)
  private async assertVisible(
    event: { audience_type: AudienceType; eventClasses: { class_id: string }[] },
    user: JwtPayload,
  ) {
    if (user.userType === 'institution' || user.userType === 'super_admin') {
      return;
    }

    const eventClassIds = event.eventClasses.map((ec) => ec.class_id);

    if (user.userType === 'teacher') {
      if (event.audience_type === AudienceType.teacher) return;
      const classIds = await this.teacherClassIds(user.userId);
      if (eventClassIds.some((id) => classIds.includes(id))) return;
      throw new ForbiddenException('Evento fora do seu escopo');
    }

    // student
    if (event.audience_type !== AudienceType.student) {
      throw new ForbiddenException('Evento fora do seu escopo');
    }
    const classIds = await this.studentClassIds(user.userId);
    if (eventClassIds.some((id) => classIds.includes(id))) return;
    throw new ForbiddenException('Evento fora do seu escopo');
  }

  // Valida que as turmas selecionadas são permitidas para quem cria/edita
  private async assertClassesAllowed(classIds: string[], user: JwtPayload) {
    if (classIds.length === 0) return;

    if (user.userType === 'teacher') {
      const allowed = await this.teacherClassIds(user.userId);
      const invalid = classIds.filter((id) => !allowed.includes(id));
      if (invalid.length > 0) {
        throw new ForbiddenException(
          'Você não tem acesso a uma das turmas selecionadas',
        );
      }
      return;
    }

    // instituição: turmas precisam pertencer à mesma instituição (via Course)
    const found = await this.prisma.class.findMany({
      where: {
        id: { in: classIds },
        course: { institution_id: user.institutionId },
      },
      select: { id: true },
    });
    if (found.length !== classIds.length) {
      throw new ForbiddenException('Turma inválida para esta instituição');
    }
  }

  private async teacherClassIds(userId: string): Promise<string[]> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { user_id: userId },
      select: { teacherClasses: { select: { class_id: true } } },
    });
    return teacher?.teacherClasses.map((tc) => tc.class_id) ?? [];
  }

  private async studentClassIds(userId: string): Promise<string[]> {
    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
      select: { studentClasses: { select: { class_id: true } } },
    });
    return student?.studentClasses.map((sc) => sc.class_id) ?? [];
  }

  private buildDateFilter(range?: DateRange): Prisma.EventWhereInput | null {
    if (!range || (!range.from && !range.to)) return null;
    // Eventos que se sobrepõem à janela [from, to]
    const filter: Prisma.EventWhereInput = {};
    if (range.to) filter.start_date = { lte: new Date(range.to) };
    if (range.from) filter.end_date = { gte: new Date(range.from) };
    return filter;
  }
}
