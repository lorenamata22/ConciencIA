'use client';

import { useEffect, useState } from 'react';
import {
  getRagCoverage,
  type ModuleCoverage,
  type SubjectCoverage,
} from '@/lib/api/subjects';

/* ── Ícones de status ─────────────────────────────────────────────── */

function CoveredIcon() {
  return (
    <span
      data-status="covered"
      title="Tema cubierto por el material indexado"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span className="sr-only">Cubierto</span>
    </span>
  );
}

function UncoveredIcon() {
  return (
    <span
      data-status="uncovered"
      title="Sin material indexado que cubra este tema"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 8v5" />
        <path d="M12 17h.01" />
      </svg>
      <span className="sr-only">Sin cubrir</span>
    </span>
  );
}

/* ── Bloco de um módulo ───────────────────────────────────────────── */

function ModuleBlock({ module }: { module: ModuleCoverage }) {
  const [open, setOpen] = useState(true);
  const covered = module.topics.filter((topic) => topic.covered).length;

  return (
    <article className="overflow-hidden rounded-xl border border-brand-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm"
      >
        <span>{module.name}</span>
        <span className="shrink-0 text-xs text-brand-label">
          {covered}/{module.topics.length}
        </span>
      </button>

      {open && (
        <div className="mx-6 mb-6 flex flex-col gap-3 rounded-xl bg-[#E8EAEA] px-5 py-4">
          {module.topics.map((topic) => (
            <div
              key={topic.id}
              data-testid={`topic-${topic.id}`}
              className="flex items-start gap-3"
            >
              {topic.covered ? <CoveredIcon /> : <UncoveredIcon />}
              <div className="min-w-0">
                <p className="text-sm font-medium">{topic.title}</p>
                {topic.covered && topic.document_name && (
                  <p className="mt-0.5 truncate text-xs text-brand-label">
                    {topic.document_name}
                  </p>
                )}
                {!topic.covered && (
                  <p className="mt-0.5 text-xs text-amber-700">
                    Sin material que cubra este tema
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

/* ── Modal ────────────────────────────────────────────────────────── */

// Sonda de cobertura: para cada tema del programa, ¿el material indexado
// contiene algo que el retrieval encontraría? Es el mismo criterio que usa
// el Modo Examen, así que un check verde significa que el examen de ese
// tema se puede generar.
export function RagCoverageModal({
  subjectId,
  onClose,
}: {
  subjectId: string;
  onClose: () => void;
}) {
  const [coverage, setCoverage] = useState<SubjectCoverage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getRagCoverage(subjectId).then((result) => {
      if (!active) return;
      if (result.data) {
        setCoverage(result.data);
      } else {
        setError(
          result.message ||
            'No se pudo verificar la cobertura. Inténtalo nuevamente.',
        );
      }
    });

    return () => {
      active = false;
    };
  }, [subjectId]);

  const loading = coverage === null && error === null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 px-8 pt-8 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-brand-brown">
              Cobertura del programa
            </h2>
            {coverage && (
              <p className="mt-1 text-sm text-brand-label">
                {coverage.covered_count} de {coverage.total_count} temas con
                material indexado
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-brand-label transition-colors hover:text-brand-brown"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {loading && (
            <p className="py-8 text-center text-sm text-brand-label">
              Analizando el material indexado...
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          {coverage && coverage.total_count === 0 && (
            <p className="py-8 text-center text-sm text-brand-label">
              Esta asignatura todavía no tiene temas en su programa.
            </p>
          )}

          {coverage && coverage.total_count > 0 && (
            <div className="flex flex-col gap-3">
              {coverage.modules.map((module) => (
                <ModuleBlock key={module.id} module={module} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
