import { Injectable } from '@nestjs/common';
import { ExamType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EXAM_MAIN_QUESTIONS } from '../exam/exam.constants';

// Student_Metrics é agregado por subject (CLAUDE.md §12) — módulo mínimo:
// apenas a atualização consumida pelo ExamModule. Endpoints de leitura
// ficam para a fase de dashboard.

export interface UpdateAfterExamInput {
  examType: ExamType;
  executionTime: number;
}

@Injectable()
export class StudentMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  // main: recalcula accuracy_rate (média de final_score/total dos exams main
  // concluídos da subject) + incrementa attempts/total_time.
  // retry: só attempts/total_time — o quiz é composto só do que o aluno
  // errou (amostra enviesada), então accuracy_rate não muda.
  async updateAfterExam(
    studentId: string,
    subjectId: string,
    input: UpdateAfterExamInput,
  ): Promise<void> {
    let accuracyRate: number | undefined;

    if (input.examType === ExamType.main) {
      const aggregate = await this.prisma.exam.aggregate({
        where: {
          student_id: studentId,
          subject_id: subjectId,
          exam_type: ExamType.main,
          completed_at: { not: null },
        },
        _avg: { final_score: true },
      });
      accuracyRate = (aggregate._avg.final_score ?? 0) / EXAM_MAIN_QUESTIONS;
    }

    await this.prisma.studentMetrics.upsert({
      where: {
        student_id_subject_id: {
          student_id: studentId,
          subject_id: subjectId,
        },
      },
      update: {
        total_time: { increment: input.executionTime },
        attempts: { increment: 1 },
        ...(accuracyRate !== undefined ? { accuracy_rate: accuracyRate } : {}),
      },
      create: {
        student_id: studentId,
        subject_id: subjectId,
        accuracy_rate: accuracyRate ?? 0,
        total_time: input.executionTime,
        attempts: 1,
      },
    });
  }
}
