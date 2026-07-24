import { alertTitle, alertDetail, relativeDetected } from './alert-labels';
import type { StudentAlert } from '@/lib/api/alerts';

function makeAlert(over: Partial<StudentAlert>): StudentAlert {
  return {
    id: 'a1',
    alert_type: 'difficulty',
    level: 'high',
    subject_id: 's1',
    subject_name: 'Matemáticas',
    topic_id: 't1',
    topic_title: 'Teorema de Pitágoras',
    description: 'desc',
    metadata: {},
    created_at: new Date().toISOString(),
    ...over,
  };
}

describe('alert-labels', () => {
  describe('alertTitle', () => {
    it('should append the topic title for difficulty alerts', () => {
      const alert = makeAlert({ alert_type: 'difficulty', topic_title: 'Teorema de Pitágoras' });
      expect(alertTitle(alert)).toBe('Dificultad detectada · Teorema de Pitágoras');
    });

    it('should show only the label for a global alert without topic', () => {
      const alert = makeAlert({ alert_type: 'never_started', topic_title: null });
      expect(alertTitle(alert)).toBe('Nunca inició');
    });
  });

  describe('alertDetail', () => {
    it('should format difficulty metadata with attempts and joined scores', () => {
      const alert = makeAlert({
        alert_type: 'difficulty',
        metadata: { attempts: 3, scores: [2, 1] },
      });
      expect(alertDetail(alert)).toBe('3 intentos · últimas puntuaciones 2/1');
    });

    it('should format inactivity metadata with days_inactive', () => {
      const alert = makeAlert({ alert_type: 'inactivity', metadata: { days_inactive: 9 } });
      expect(alertDetail(alert)).toBe('9 días sin actividad');
    });

    it('should format never_started metadata with days_since_registration', () => {
      const alert = makeAlert({
        alert_type: 'never_started',
        metadata: { days_since_registration: 8 },
      });
      expect(alertDetail(alert)).toBe(
        'Registrado hace 8 días · test cognitivo pendiente',
      );
    });

    it('should format low_participation metadata with days_without_exam', () => {
      const alert = makeAlert({
        alert_type: 'low_participation',
        metadata: { days_without_exam: 21 },
      });
      expect(alertDetail(alert)).toBe('Activo, pero sin exámenes hace 21 días');
    });
  });

  describe('relativeDetected', () => {
    it('should render "hace N días" for a past date', () => {
      const now = new Date('2026-07-23T12:00:00Z');
      const created = new Date('2026-07-19T12:00:00Z').toISOString();
      expect(relativeDetected(created, now)).toBe('Detectado hace 4 días');
    });

    it('should render "hoy" for the same day', () => {
      const now = new Date('2026-07-23T18:00:00Z');
      const created = new Date('2026-07-23T09:00:00Z').toISOString();
      expect(relativeDetected(created, now)).toBe('Detectado hoy');
    });
  });
});
