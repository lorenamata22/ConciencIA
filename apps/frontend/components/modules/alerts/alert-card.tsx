import type { StudentAlert } from '@/lib/api/alerts';
import { AlertItem } from './alert-item';

interface AlertGroup {
  key: string;
  subjectName: string | null; // null = alertas globais
  alerts: StudentAlert[];
}

// Agrupa por matéria preservando a ordem do backend (level desc, recência).
// Alertas globais (subject_id = null) num grupo próprio, sempre no topo.
function groupBySubject(alerts: StudentAlert[]): AlertGroup[] {
  const groups = new Map<string, AlertGroup>();
  for (const alert of alerts) {
    const key = alert.subject_id ?? '__global__';
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        subjectName: alert.subject_id ? alert.subject_name : null,
        alerts: [],
      });
    }
    groups.get(key)!.alerts.push(alert);
  }

  const ordered = [...groups.values()];
  ordered.sort((a, b) => {
    if (a.key === '__global__') return -1;
    if (b.key === '__global__') return 1;
    return 0;
  });
  return ordered;
}

// Card de alertas da visão individual. Só existe se houver alerta não-resolvido —
// lista vazia → não renderiza (sem estado vazio).
// `ownedSubjectIds` = matérias do professor logado nesta turma. O botão de
// resolver só aparece nos alertas de matéria que ele leciona (globais liberados).
export function AlertCard({
  alerts,
  classId,
  studentId,
  ownedSubjectIds,
}: {
  alerts: StudentAlert[];
  classId: string;
  studentId: string;
  ownedSubjectIds: string[];
}) {
  if (alerts.length === 0) return null;

  const owned = new Set(ownedSubjectIds);
  const groups = groupBySubject(alerts);

  return (
    <div className="rounded-2xl card-shadow overflow-hidden mb-10">
      <div className="px-6 py-5 border-b border-brand-border">
        <span className="text-sm font-semibold text-brand-brown">Alertas</span>
      </div>

      <div className="flex flex-col">
        {groups.map((group) => (
          <div key={group.key}>
            {/* Nome da matéria sempre visível, mesmo com um único grupo */}
            <p className="px-5 pt-4 pb-1 text-xs font-semibold text-brand-label tracking-wide uppercase">
              {group.subjectName ?? 'General'}
            </p>
            {group.alerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                classId={classId}
                studentId={studentId}
                canResolve={alert.subject_id === null || owned.has(alert.subject_id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
