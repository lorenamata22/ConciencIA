'use client';

import { useState, useTransition } from 'react';
import type { StudentAlert } from '@/lib/api/alerts';
import { alertTitle, alertDetail, relativeDetected } from './alert-labels';
import { resolveAlertAction } from '@/app/(app)/teacher/classes/actions';

// Uma linha de alerta. `level` (high/medium) muda a intensidade visual do
// ícone/borda, não o layout. O botão resolve manualmente e revalida a página.
export function AlertItem({
  alert,
  classId,
  studentId,
  canResolve,
}: {
  alert: StudentAlert;
  classId: string;
  studentId: string;
  canResolve: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isHigh = alert.level === 'high';

  function handleResolve() {
    setError(null);
    startTransition(async () => {
      const result = await resolveAlertAction(alert.id, classId, studentId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div
      data-level={alert.level}
      className={`flex items-start gap-3 px-5 py-4 border-l-2 ${
        isHigh ? 'border-amber-500' : 'border-amber-300'
      }`}
    >
      <span
        className={`shrink-0 mt-0.5 ${isHigh ? 'text-amber-600' : 'text-amber-400'}`}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brand-brown">{alertTitle(alert)}</p>
        <p className="text-sm text-brand-label mt-0.5">{alertDetail(alert)}</p>
        <p className="text-xs text-brand-placeholder mt-1">
          {relativeDetected(alert.created_at)}
        </p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {canResolve && (
        <button
          onClick={handleResolve}
          disabled={isPending}
          className="shrink-0 rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Resolviendo…' : 'Marcar como resuelto'}
        </button>
      )}
    </div>
  );
}
