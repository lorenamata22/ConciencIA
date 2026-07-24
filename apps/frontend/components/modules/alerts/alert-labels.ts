// Centraliza os textos em espanhol e a formatação do `metadata` por tipo de
// alerta. Nada de string solta no JSX. `alert_type` chega em lowercase do banco
// (difficulty | inactivity | never_started | low_participation).

import type { AlertMetadata, StudentAlert } from '@/lib/api/alerts';

interface AlertLabel {
  title: string;
  formatDetail: (metadata: AlertMetadata) => string;
}

const LABELS: Record<string, AlertLabel> = {
  difficulty: {
    title: 'Dificultad detectada',
    formatDetail: (m) => {
      const attempts = m.attempts ?? 0;
      const scores = m.scores?.length ? m.scores.join('/') : '—';
      return `${attempts} intentos · últimas puntuaciones ${scores}`;
    },
  },
  inactivity: {
    title: 'Sin actividad',
    formatDetail: (m) => `${m.days_inactive ?? 0} días sin actividad`,
  },
  never_started: {
    title: 'Nunca inició',
    formatDetail: (m) =>
      `Registrado hace ${m.days_since_registration ?? 0} días · test cognitivo pendiente`,
  },
  low_participation: {
    title: 'Baja participación',
    formatDetail: (m) => `Activo, pero sin exámenes hace ${m.days_without_exam ?? 0} días`,
  },
};

// Título do alerta: label do tipo + tópico quando houver (DIFFICULTY).
// Globais (sem tópico) mostram só o label.
export function alertTitle(alert: Pick<StudentAlert, 'alert_type' | 'topic_title'>): string {
  const label = LABELS[alert.alert_type];
  const base = label?.title ?? alert.alert_type;
  return alert.topic_title ? `${base} · ${alert.topic_title}` : base;
}

// Detalhe legível montado a partir do metadata (números já vêm prontos).
export function alertDetail(
  alert: Pick<StudentAlert, 'alert_type' | 'metadata' | 'description'>,
): string {
  const label = LABELS[alert.alert_type];
  return label ? label.formatDetail(alert.metadata) : alert.description;
}

// Tempo relativo desde created_at — "Detectado hace N días" (hoy / hace 1 día).
export function relativeDetected(createdAt: string, now: Date = new Date()): string {
  const created = new Date(createdAt);
  const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Detectado hoy';
  if (days === 1) return 'Detectado hace 1 día';
  return `Detectado hace ${days} días`;
}
