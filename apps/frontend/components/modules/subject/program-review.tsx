"use client";

import { useState } from "react";
import type { OrphanLine, ProgramCoverage } from "@/lib/api/subjects";
import type { ReviewModule, ReviewTopic } from "./review-state";
import { CoverageIndicator } from "./coverage-indicator";
import { ModuleAccordion } from "./module-accordion";
import { OrphanLinesSection } from "./orphan-lines-section";

// Tela 2: review editável. Cobertura + módulos + órfãs + "Registrar asignatura".
export function ProgramReview({
  modules,
  coverage,
  orphans,
  canRegister,
  persisting,
  error,
  subjectName,
  onRenameModule,
  onRemoveModule,
  onAddModule,
  onAddTopic,
  onRemoveTopic,
  onTopicChange,
  onBack,
  onRegister,
}: {
  modules: ReviewModule[];
  coverage: ProgramCoverage;
  orphans: OrphanLine[];
  canRegister: boolean;
  persisting: boolean;
  error: string | null;
  subjectName: string;
  onRenameModule: (moduleKey: string, name: string) => void;
  onRemoveModule: (moduleKey: string) => void;
  onAddModule: () => void;
  onAddTopic: (moduleKey: string) => void;
  onRemoveTopic: (moduleKey: string, topicKey: string) => void;
  onTopicChange: (
    moduleKey: string,
    topicKey: string,
    patch: Partial<Pick<ReviewTopic, "title" | "description">>,
  ) => void;
  onBack: () => void;
  onRegister: () => void;
}) {
  // Um módulo aberto por vez (padrão do Figma)
  const [openKey, setOpenKey] = useState<string | null>(
    modules[0]?.key ?? null,
  );

  return (
    <div className="flex flex-col gap-5">
      <CoverageIndicator coverage={coverage} />

      <div className="flex flex-col gap-3">
          
        <section className="rounded-2xl border border-brand-border p-6">
          <h2 className="mb-5 text-sm tracking-wide text-brand-label uppercase">
            {subjectName}
          </h2>
          
          {modules.map((module, index) => (
          <ModuleAccordion
            key={module.key}
            module={module}
            index={index}
            open={openKey === module.key}
            onToggle={() =>
              setOpenKey((current) =>
                current === module.key ? null : module.key,
              )
            }
            onRename={(name) => onRenameModule(module.key, name)}
            onRemove={() => onRemoveModule(module.key)}
            onAddTopic={() => onAddTopic(module.key)}
            onRemoveTopic={(topicKey) => onRemoveTopic(module.key, topicKey)}
            onTopicChange={(topicKey, patch) =>
              onTopicChange(module.key, topicKey, patch)
            }
          />
        ))}
          
        </section>

        
      </div>

      <button
        type="button"
        onClick={onAddModule}
        className="w-fit rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-label transition-colors hover:bg-brand-border/30"
      >
        + Añadir módulo
      </button>

      <OrphanLinesSection orphans={orphans} />

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
  );
}
