import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertType } from './alert.constants';

export interface AlertView {
  id: string;
  alert_type: string;
  level: string;
  subject_id: string | null;
  subject_name: string | null;
  topic_id: string | null;
  topic_title: string | null;
  description: string;
  metadata: unknown;
  created_at: Date;
}

export interface TopicAlertCount {
  topic_id: string;
  topic_title: string | null;
  student_count: number;
}

// Leitura e resolução de alertas. A avaliação das regras vive no
// AlertRulesService. Todo acesso é isolado por institution_id do JWT.
@Injectable()
export class AlertService {
  constructor(private readonly prisma: PrismaService) {}

  // Contador "En riesgo": ids dos alunos com ≥1 alerta não-resolvido.
  // Uma única query (groupBy) — nada de N+1 com a turma na tela.
  async getRiskStudentIds(
    studentIds: string[],
    institutionId: string,
  ): Promise<Set<string>> {
    if (studentIds.length === 0) {
      return new Set();
    }
    const rows = await this.prisma.alert.groupBy({
      by: ['student_id'],
      where: {
        institution_id: institutionId,
        student_id: { in: studentIds },
        resolved: false,
      },
    });
    return new Set(rows.map((row) => row.student_id));
  }

  // Alertas de um aluno, com nome de matéria/tópico resolvidos.
  // Ordena por gravidade (level desc) e depois recência.
  async findByStudent(
    studentId: string,
    institutionId: string,
    filter?: { resolved?: boolean },
  ): Promise<AlertView[]> {
    const alerts = await this.prisma.alert.findMany({
      where: {
        student_id: studentId,
        institution_id: institutionId,
        ...(filter?.resolved !== undefined ? { resolved: filter.resolved } : {}),
      },
      orderBy: [{ level: 'desc' }, { created_at: 'desc' }],
    });

    // subject_id/topic_id são colunas denormalizadas (sem relation) — resolve
    // os nomes em lote para evitar N+1
    const subjectIds = uniqueNonNull(alerts.map((a) => a.subject_id));
    const topicIds = uniqueNonNull(alerts.map((a) => a.topic_id));

    const subjects = subjectIds.length
      ? await this.prisma.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true },
        })
      : [];
    const topics = topicIds.length
      ? await this.prisma.topic.findMany({
          where: { id: { in: topicIds } },
          select: { id: true, title: true },
        })
      : [];

    const subjectNames = new Map(subjects.map((s) => [s.id, s.name]));
    const topicTitles = new Map(topics.map((t) => [t.id, t.title]));

    return alerts.map((alert) => ({
      id: alert.id,
      alert_type: alert.alert_type,
      level: alert.level,
      subject_id: alert.subject_id,
      subject_name: alert.subject_id
        ? (subjectNames.get(alert.subject_id) ?? null)
        : null,
      topic_id: alert.topic_id,
      topic_title: alert.topic_id
        ? (topicTitles.get(alert.topic_id) ?? null)
        : null,
      description: alert.description,
      metadata: alert.metadata,
      created_at: alert.created_at,
    }));
  }

  // Resolução manual pelo professor — grava resolved_by = userId do JWT.
  async resolve(
    alertId: string,
    userId: string,
    institutionId: string,
  ): Promise<void> {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
    });
    if (!alert) {
      throw new NotFoundException('Alerta no encontrada');
    }
    if (alert.institution_id !== institutionId) {
      throw new ForbiddenException('La alerta no pertenece a tu institución');
    }

    await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolved_at: new Date(),
        resolved_by: userId,
      },
    });
  }

  // Agrega alertas DIFFICULTY não-resolvidos por tópico na turma. Se muitos
  // alunos travaram no mesmo tópico, o problema é o material/aula.
  async getAlertsByTopic(
    classId: string,
    institutionId: string,
  ): Promise<TopicAlertCount[]> {
    const studentClasses = await this.prisma.studentClass.findMany({
      where: { class_id: classId },
      select: { student_id: true },
    });
    const studentIds = studentClasses.map((sc) => sc.student_id);
    if (studentIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.alert.groupBy({
      by: ['topic_id'],
      where: {
        institution_id: institutionId,
        alert_type: AlertType.DIFFICULTY,
        resolved: false,
        student_id: { in: studentIds },
        topic_id: { not: null },
      },
      _count: { _all: true },
    });

    const topicIds = uniqueNonNull(rows.map((row) => row.topic_id));
    const topics = topicIds.length
      ? await this.prisma.topic.findMany({
          where: { id: { in: topicIds } },
          select: { id: true, title: true },
        })
      : [];
    const topicTitles = new Map(topics.map((t) => [t.id, t.title]));

    return rows
      .filter((row) => row.topic_id != null)
      .map((row) => ({
        topic_id: row.topic_id as string,
        topic_title: topicTitles.get(row.topic_id as string) ?? null,
        student_count: row._count._all,
      }));
  }
}

function uniqueNonNull(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => v != null))];
}
