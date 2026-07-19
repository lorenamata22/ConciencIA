import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateConversationInput {
  student_id: string;
  subject_id: string;
  // Obrigatório: cada tópico é uma sessão de aula — o histórico fragmenta por tópico (§8)
  topic_id: string;
}

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateConversationInput) {
    return this.prisma.conversation.create({ data: input });
  }

  // Ownership: aluno só acessa conversas dele — Forbidden, nunca dados de outro
  async findOne(id: string, studentId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }
    if (conversation.student_id !== studentId) {
      throw new ForbiddenException('Conversa não pertence ao aluno');
    }
    return conversation;
  }

  // 1 conversa contínua por (aluno, matéria, tópico): retoma a mais recente ou
  // cria uma nova. Valida que o tópico pertence ao tenant e à matéria informada.
  async resumeOrCreateByUser(
    userId: string,
    institutionId: string,
    subjectId: string,
    topicId: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
    });
    if (!student) {
      throw new NotFoundException('Alumno no encontrado');
    }

    await this.assertTopicInSubjectAndTenant(topicId, subjectId, institutionId);

    const existing = await this.prisma.conversation.findFirst({
      where: {
        student_id: student.id,
        subject_id: subjectId,
        topic_id: topicId,
      },
      orderBy: { created_at: 'desc' },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        student_id: student.id,
        subject_id: subjectId,
        topic_id: topicId,
      },
    });
  }

  async findByStudentAndTopic(
    studentId: string,
    subjectId: string,
    topicId: string,
  ) {
    return this.prisma.conversation.findMany({
      where: {
        student_id: studentId,
        subject_id: subjectId,
        topic_id: topicId,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // Isolamento por cadeia de JOIN (§5): topic → module → subject → course →
  // institution_id. Tenant errado → 403; tópico fora da matéria → 400.
  private async assertTopicInSubjectAndTenant(
    topicId: string,
    subjectId: string,
    institutionId: string,
  ) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { module: { include: { subject: { include: { course: true } } } } },
    });
    if (!topic) {
      throw new NotFoundException('Tema no encontrado');
    }
    if (topic.module.subject.course.institution_id !== institutionId) {
      throw new ForbiddenException('El tema no pertenece a la institución');
    }
    if (topic.module.subject_id !== subjectId) {
      throw new BadRequestException(
        'El tema no pertenece a la asignatura indicada',
      );
    }
  }
}
