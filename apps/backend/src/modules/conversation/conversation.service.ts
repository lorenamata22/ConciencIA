import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateConversationInput {
  student_id: string;
  subject_id: string;
  topic_id?: string;
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

  // 1 conversa contínua por matéria: retoma a mais recente ou cria uma nova.
  // Recebe userId (do JWT) e resolve o Student internamente.
  async resumeOrCreateByUser(userId: string, subjectId: string) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
    });
    if (!student) {
      throw new NotFoundException('Alumno no encontrado');
    }

    const existing = await this.prisma.conversation.findFirst({
      where: { student_id: student.id, subject_id: subjectId },
      orderBy: { created_at: 'desc' },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { student_id: student.id, subject_id: subjectId },
    });
  }

  async findByStudentAndSubject(studentId: string, subjectId: string) {
    return this.prisma.conversation.findMany({
      where: { student_id: studentId, subject_id: subjectId },
      orderBy: { created_at: 'desc' },
    });
  }
}
