"use client";

import type { ReviewModule } from "./review-state";
import { ProgramStructureView } from "./program-structure-view";

// Tela 2: preview somente leitura do resultado do parse. O usuário aprova
// direto ("Registrar asignatura") ou entra no modo de edição ("Editar").
export function ProgramPreview({
  subjectName,
  modules,
  canRegister,
  persisting,
  error,
  onEdit,
  onBack,
  onRegister,
}: {
  subjectName: string;
  modules: ReviewModule[];
  canRegister: boolean;
  persisting: boolean;
  error: string | null;
  onEdit: () => void;
  onBack: () => void;
  onRegister: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <ProgramStructureView subjectName={subjectName} modules={modules} />

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={persisting}
          className="flex items-center gap-1.5 text-sm text-brand-label transition-colors hover:text-brand-brown disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver
        </button>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onEdit}
            disabled={persisting}
            className="flex items-center gap-2 rounded-xl border border-brand-border px-6 py-3 text-sm font-medium text-brand-label transition-colors hover:bg-brand-border/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Editar
          </button>
          <button
            type="button"
            onClick={onRegister}
            disabled={!canRegister || persisting}
            className="rounded-xl bg-[#999DA3] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#999DA3]/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {persisting ? "Registrando..." : "Registrar asignatura"}
          </button>
        </div>
      </div>
    </div>
  );
}
