import type { StudentRiskStatus } from '@/lib/api/classes';

// Badge de estado do aluno na listagem. `status` é derivado no backend.
// "En riesgo" usa âmbar (não vermelho — vermelho fica reservado a erro de sistema).
export function AlertStatusBadge({ status }: { status: StudentRiskStatus }) {
  if (status === 'at_risk') {
    return (
      <span
        data-status="at_risk"
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        En riesgo
      </span>
    );
  }

  return (
    <span
      data-status="stable"
      className="inline-flex items-center gap-1.5 rounded-full bg-brand-border/20 px-3 py-1 text-xs font-medium text-brand-label border border-brand-border"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-brand-placeholder" />
      Estable
    </span>
  );
}
