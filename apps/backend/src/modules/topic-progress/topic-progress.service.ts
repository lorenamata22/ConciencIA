import { Injectable } from '@nestjs/common';
import { ProgressStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TopicProgressService {
  constructor(private readonly prisma: PrismaService) {}

  // Upsert pela unique composta (student_id, topic_id) — nunca duplica progresso
  async upsert(
    studentId: string,
    topicId: string,
    status: ProgressStatus,
    totalTime?: number,
  ) {
    return this.prisma.topicProgress.upsert({
      where: {
        student_id_topic_id: { student_id: studentId, topic_id: topicId },
      },
      update: {
        status,
        ...(totalTime !== undefined && { total_time: totalTime }),
      },
      create: {
        student_id: studentId,
        topic_id: topicId,
        status,
        total_time: totalTime ?? 0,
      },
    });
  }

  // Regra inegociável (CLAUDE.md §12): tópico só vira completed após o aluno
  // concluir o exame main do tópico; retry nunca chama este método.
  async markAsCompleted(studentId: string, topicId: string) {
    return this.upsert(studentId, topicId, ProgressStatus.completed);
  }

  async findByStudent(studentId: string) {
    return this.prisma.topicProgress.findMany({
      where: { student_id: studentId },
    });
  }

  async getByStudentAndSubject(studentId: string, subjectId: string) {
    return this.prisma.topicProgress.findMany({
      where: {
        student_id: studentId,
        topic: { module: { subject_id: subjectId } },
      },
    });
  }
}
