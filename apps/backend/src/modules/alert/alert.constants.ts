// Constantes do AlertModule (CLAUDE.md §14 + prompt do módulo). Todos os
// thresholds vivem aqui — não configurável por instituição no MVP.

export const QUEUE_ALERT_SCAN = 'alert-scan';

// Cron do job diário de varredura (03:00) — alertas de *ausência*
export const ALERT_SCAN_CRON = '0 3 * * *';

// ── Thresholds ──────────────────────────────────────────────────────────
export const INACTIVITY_DAYS = 7;
export const INACTIVITY_HIGH_DAYS = 14; // > 14 dias inativo → high

export const NEVER_STARTED_GRACE_DAYS = 7;

export const DIFFICULTY_MIN_ATTEMPTS = 2;
export const DIFFICULTY_MAX_SCORE = 2;
export const DIFFICULTY_HIGH_ATTEMPTS = 3;
export const DIFFICULTY_HIGH_MESSAGE_COUNT = 20;
// Auto-resolve de DIFFICULTY quando o aluno tira score >= isto no tópico
export const DIFFICULTY_RESOLVE_SCORE = 4;

export const LOW_PARTICIPATION_NO_EXAM_DAYS = 21;
export const LOW_PARTICIPATION_MIN_ENROLLMENT_DAYS = 30;
// Derivado — mesma janela do INACTIVITY para que sejam mutuamente exclusivos
export const LOW_PARTICIPATION_ACTIVE_WINDOW_DAYS = INACTIVITY_DAYS;

// ── Enums em código (não no schema — Alert.alert_type/level são String) ───
export enum AlertType {
  DIFFICULTY = 'difficulty',
  INACTIVITY = 'inactivity',
  NEVER_STARTED = 'never_started',
  LOW_PARTICIPATION = 'low_participation',
}

export enum AlertLevel {
  MEDIUM = 'medium',
  HIGH = 'high',
}

// ── Templates de description por tipo + nível (sem IA) ────────────────────
export interface AlertMetadata {
  attempts?: number;
  scores?: number[];
  topic_title?: string;
  days_inactive?: number;
  days_since_registration?: number;
  days_without_exam?: number;
}

// Gera a descrição legível do alerta a partir do tipo, nível e metadados.
export function buildAlertDescription(
  type: AlertType,
  level: AlertLevel,
  metadata: AlertMetadata,
): string {
  switch (type) {
    case AlertType.DIFFICULTY: {
      const topic = metadata.topic_title ?? 'un tema';
      const attempts = metadata.attempts ?? DIFFICULTY_MIN_ATTEMPTS;
      const intensity =
        level === AlertLevel.HIGH ? 'dificultad persistente' : 'dificultad';
      return `El alumno muestra ${intensity} en "${topic}": ${attempts} intentos con baja puntuación.`;
    }
    case AlertType.INACTIVITY: {
      const days = metadata.days_inactive ?? INACTIVITY_DAYS;
      return `El alumno no registra actividad desde hace ${days} días.`;
    }
    case AlertType.NEVER_STARTED: {
      const days = metadata.days_since_registration ?? NEVER_STARTED_GRACE_DAYS;
      return `El alumno se registró hace ${days} días y aún no completó el test cognitivo.`;
    }
    case AlertType.LOW_PARTICIPATION: {
      const days = metadata.days_without_exam ?? LOW_PARTICIPATION_NO_EXAM_DAYS;
      return `El alumno está activo pero no completó ningún examen en ${days} días.`;
    }
  }
}
