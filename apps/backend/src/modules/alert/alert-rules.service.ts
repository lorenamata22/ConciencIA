import { Injectable } from '@nestjs/common';
import { MessageRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AlertLevel,
  AlertMetadata,
  AlertType,
  buildAlertDescription,
  DIFFICULTY_HIGH_ATTEMPTS,
  DIFFICULTY_HIGH_MESSAGE_COUNT,
  DIFFICULTY_MAX_SCORE,
  DIFFICULTY_MIN_ATTEMPTS,
  DIFFICULTY_RESOLVE_SCORE,
  INACTIVITY_DAYS,
  INACTIVITY_HIGH_DAYS,
  LOW_PARTICIPATION_ACTIVE_WINDOW_DAYS,
  LOW_PARTICIPATION_MIN_ENROLLMENT_DAYS,
  LOW_PARTICIPATION_NO_EXAM_DAYS,
  NEVER_STARTED_GRACE_DAYS,
} from './alert.constants';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (a: Date, b: Date): number =>
  Math.floor((a.getTime() - b.getTime()) / DAY_MS);

interface DifficultyInput {
  studentId: string;
  topicId: string;
  subjectId: string;
  institutionId: string;
}

interface CreateInput {
  studentId: string;
  institutionId: string;
  type: AlertType;
  level: AlertLevel;
  subjectId: string | null;
  topicId: string | null;
  metadata: AlertMetadata;
}

interface ScanStudent {
  id: string;
  cognitive_test_date: Date | null;
  last_activity_at: Date | null;
  user: { created_at: Date };
}

// Avaliação determinística das 4 regras de alerta + auto-resolução.
// Nenhuma chamada de IA em ponto algum (PRD). Todo where filtra por tenant.
@Injectable()
export class AlertRulesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── DIFFICULTY — avaliado no submit de exame (evento, não vai ao job) ────
  async evaluateDifficulty(input: DifficultyInput): Promise<void> {
    const { studentId, topicId, subjectId, institutionId } = input;

    const exams = await this.prisma.exam.findMany({
      where: {
        student_id: studentId,
        topic_id: topicId,
        completed_at: { not: null },
      },
      orderBy: { completed_at: 'desc' },
      select: { final_score: true },
    });

    // Qualquer exame concluído tira o aluno de LOW_PARTICIPATION
    await this.autoResolve({
      student_id: studentId,
      alert_type: AlertType.LOW_PARTICIPATION,
    });

    const attempts = exams.length;
    const lastScore = exams[0]?.final_score ?? null;

    // Recuperou no tópico → auto-resolve e não gera novo alerta
    if (lastScore != null && lastScore >= DIFFICULTY_RESOLVE_SCORE) {
      await this.autoResolve({
        student_id: studentId,
        alert_type: AlertType.DIFFICULTY,
        topic_id: topicId,
      });
      return;
    }

    // Amostra mínima + baixa pontuação
    if (
      attempts < DIFFICULTY_MIN_ATTEMPTS ||
      lastScore == null ||
      lastScore > DIFFICULTY_MAX_SCORE
    ) {
      return;
    }

    const messageCount = await this.prisma.message.count({
      where: {
        role: MessageRole.user,
        conversation: { student_id: studentId, topic_id: topicId },
      },
    });

    const level =
      attempts >= DIFFICULTY_HIGH_ATTEMPTS ||
      messageCount > DIFFICULTY_HIGH_MESSAGE_COUNT
        ? AlertLevel.HIGH
        : AlertLevel.MEDIUM;

    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      select: { title: true },
    });

    // scores em ordem cronológica (findMany veio desc)
    const scores = exams
      .map((e) => e.final_score ?? 0)
      .slice()
      .reverse();

    await this.createIfAbsent({
      studentId,
      institutionId,
      type: AlertType.DIFFICULTY,
      level,
      subjectId,
      topicId,
      metadata: { attempts, scores, topic_title: topic?.title },
    });
  }

  // ── Job diário — alertas de ausência, varredura por instituição ──────────
  async runDailyScan(institutionId: string): Promise<void> {
    const now = new Date();
    const students = (await this.prisma.student.findMany({
      where: { user: { institution_id: institutionId } },
      select: {
        id: true,
        cognitive_test_date: true,
        last_activity_at: true,
        user: { select: { created_at: true } },
      },
    })) as ScanStudent[];

    for (const student of students) {
      await this.evaluateInactivity(student, institutionId, now);
      await this.evaluateNeverStarted(student, institutionId, now);
      await this.evaluateLowParticipation(student, institutionId, now);
    }
  }

  // ── Regras individuais do job ────────────────────────────────────────────

  private async evaluateInactivity(
    student: ScanStudent,
    institutionId: string,
    now: Date,
  ): Promise<void> {
    // Só alunos que já entraram (fizeram o teste cognitivo)
    if (student.cognitive_test_date == null || student.last_activity_at == null) {
      return;
    }

    const daysInactive = daysBetween(now, student.last_activity_at);
    if (daysInactive < INACTIVITY_DAYS) {
      // Voltou para dentro da janela → auto-resolve
      await this.autoResolve({
        student_id: student.id,
        alert_type: AlertType.INACTIVITY,
      });
      return;
    }

    const level =
      daysInactive > INACTIVITY_HIGH_DAYS ? AlertLevel.HIGH : AlertLevel.MEDIUM;

    await this.createIfAbsent({
      studentId: student.id,
      institutionId,
      type: AlertType.INACTIVITY,
      level,
      subjectId: null,
      topicId: null,
      metadata: { days_inactive: daysInactive },
    });
  }

  private async evaluateNeverStarted(
    student: ScanStudent,
    institutionId: string,
    now: Date,
  ): Promise<void> {
    if (student.cognitive_test_date != null) {
      // Fez o teste → auto-resolve
      await this.autoResolve({
        student_id: student.id,
        alert_type: AlertType.NEVER_STARTED,
      });
      return;
    }

    const daysSinceRegistration = daysBetween(now, student.user.created_at);
    if (daysSinceRegistration < NEVER_STARTED_GRACE_DAYS) {
      return;
    }

    await this.createIfAbsent({
      studentId: student.id,
      institutionId,
      type: AlertType.NEVER_STARTED,
      level: AlertLevel.HIGH,
      subjectId: null,
      topicId: null,
      metadata: { days_since_registration: daysSinceRegistration },
    });
  }

  private async evaluateLowParticipation(
    student: ScanStudent,
    institutionId: string,
    now: Date,
  ): Promise<void> {
    // Precisa estar ativo (janela idêntica à do INACTIVITY → mutuamente
    // exclusivos) e ter passado da amostra mínima de matrícula
    if (student.cognitive_test_date == null || student.last_activity_at == null) {
      return;
    }
    const daysInactive = daysBetween(now, student.last_activity_at);
    const active = daysInactive < LOW_PARTICIPATION_ACTIVE_WINDOW_DAYS;
    if (!active) {
      return;
    }
    const enrollmentDays = daysBetween(now, student.user.created_at);
    if (enrollmentDays < LOW_PARTICIPATION_MIN_ENROLLMENT_DAYS) {
      return;
    }

    const lastExam = await this.prisma.exam.findFirst({
      where: { student_id: student.id, completed_at: { not: null } },
      orderBy: { completed_at: 'desc' },
      select: { completed_at: true },
    });

    const daysWithoutExam = lastExam?.completed_at
      ? daysBetween(now, lastExam.completed_at)
      : enrollmentDays;

    if (daysWithoutExam < LOW_PARTICIPATION_NO_EXAM_DAYS) {
      return;
    }

    await this.createIfAbsent({
      studentId: student.id,
      institutionId,
      type: AlertType.LOW_PARTICIPATION,
      level: AlertLevel.MEDIUM,
      subjectId: null,
      topicId: null,
      metadata: { days_without_exam: daysWithoutExam },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  // Upsert por chave (student+type+subject+topic). Anti-fadiga = uma linha só:
  // se já existe um alerta não-resolvido, ATUALIZA metadata/level/description em
  // vez de duplicar. Sem isso os números congelam — ex.: uma nova tentativa no
  // mesmo tópico não atualizaria `attempts`/`scores` nem escalaria o nível.
  private async createIfAbsent(input: CreateInput): Promise<void> {
    const description = buildAlertDescription(
      input.type,
      input.level,
      input.metadata,
    );
    const metadata = input.metadata as unknown as Prisma.InputJsonValue;

    const existing = await this.prisma.alert.findFirst({
      where: {
        student_id: input.studentId,
        alert_type: input.type,
        subject_id: input.subjectId,
        topic_id: input.topicId,
        resolved: false,
      },
      select: { id: true },
    });
    if (existing) {
      // Não recria (não re-alerta), só reflete o estado atual. created_at
      // permanece o da primeira detecção — "detectado hace X" continua correto.
      await this.prisma.alert.update({
        where: { id: existing.id },
        data: { level: input.level, description, metadata },
      });
      return;
    }

    await this.prisma.alert.create({
      data: {
        student_id: input.studentId,
        institution_id: input.institutionId,
        alert_type: input.type,
        level: input.level,
        description,
        subject_id: input.subjectId,
        topic_id: input.topicId,
        metadata,
      },
    });
  }

  // Auto-resolução: resolved_by = null marca resolução automática do sistema
  private async autoResolve(where: {
    student_id: string;
    alert_type: AlertType;
    topic_id?: string;
  }): Promise<void> {
    await this.prisma.alert.updateMany({
      where: { ...where, resolved: false },
      data: {
        resolved: true,
        resolved_at: new Date(),
        resolved_by: null,
      },
    });
  }
}
