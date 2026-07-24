import { render, screen } from '@testing-library/react';
import { AlertCard } from './alert-card';
import type { StudentAlert } from '@/lib/api/alerts';

// A action é server-only (importa `server-only` transitivamente) — mockar para
// renderizar os componentes em jsdom.
jest.mock('@/app/(app)/teacher/classes/actions', () => ({
  resolveAlertAction: jest.fn().mockResolvedValue({ error: null, success: true }),
}));

function makeAlert(over: Partial<StudentAlert>): StudentAlert {
  return {
    id: Math.random().toString(),
    alert_type: 'difficulty',
    level: 'high',
    subject_id: 's1',
    subject_name: 'Matemáticas',
    topic_id: 't1',
    topic_title: 'Teorema de Pitágoras',
    description: 'desc',
    metadata: { attempts: 3, scores: [2, 1] },
    created_at: new Date().toISOString(),
    ...over,
  };
}

describe('AlertCard', () => {
  it('should not render anything when the alert list is empty', () => {
    const { container } = render(
      <AlertCard alerts={[]} classId="c1" studentId="st1" ownedSubjectIds={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should render an alert line with title and metadata detail', () => {
    render(
      <AlertCard alerts={[makeAlert({})]} classId="c1" studentId="st1" ownedSubjectIds={['s1']} />,
    );
    expect(
      screen.getByText('Dificultad detectada · Teorema de Pitágoras'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('3 intentos · últimas puntuaciones 2/1'),
    ).toBeInTheDocument();
  });

  it('should always show the subject name even with a single subject group', () => {
    render(
      <AlertCard
        alerts={[makeAlert({ subject_id: 's1', subject_name: 'Matemáticas' })]}
        classId="c1"
        studentId="st1"
        ownedSubjectIds={['s1']}
      />,
    );
    expect(screen.getByText('Matemáticas')).toBeInTheDocument();
  });

  it('should group by subject with global alerts first when there are several groups', () => {
    const alerts = [
      makeAlert({ subject_id: 's1', subject_name: 'Matemáticas', alert_type: 'difficulty' }),
      makeAlert({
        subject_id: null,
        subject_name: null,
        topic_id: null,
        topic_title: null,
        alert_type: 'never_started',
        metadata: { days_since_registration: 8 },
      }),
    ];
    render(<AlertCard alerts={alerts} classId="c1" studentId="st1" ownedSubjectIds={['s1']} />);

    const headers = screen.getAllByText(/General|Matemáticas/);
    // "General" (globais) aparece antes de "Matemáticas"
    expect(headers[0]).toHaveTextContent('General');
    expect(headers[1]).toHaveTextContent('Matemáticas');
  });

  it('should show the resolve button only for subjects the teacher owns', () => {
    const alerts = [
      makeAlert({ id: 'owned', subject_id: 's1', subject_name: 'Matemáticas' }),
      makeAlert({ id: 'foreign', subject_id: 's2', subject_name: 'Historia' }),
    ];
    render(<AlertCard alerts={alerts} classId="c1" studentId="st1" ownedSubjectIds={['s1']} />);

    // Uma matéria própria (s1) e uma alheia (s2) → só um botão
    expect(screen.getAllByRole('button', { name: 'Marcar como resuelto' })).toHaveLength(1);
  });

  it('should allow resolving global alerts even without owned subjects', () => {
    const globalAlert = makeAlert({
      subject_id: null,
      subject_name: null,
      topic_id: null,
      topic_title: null,
      alert_type: 'never_started',
      metadata: { days_since_registration: 8 },
    });
    render(<AlertCard alerts={[globalAlert]} classId="c1" studentId="st1" ownedSubjectIds={[]} />);

    expect(screen.getByRole('button', { name: 'Marcar como resuelto' })).toBeInTheDocument();
  });
});
