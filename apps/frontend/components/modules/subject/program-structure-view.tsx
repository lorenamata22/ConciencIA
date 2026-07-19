"use client";

import { useState } from "react";
import type { ReviewModule } from "./review-state";

// Visualização somente leitura da estrutura do programa: card com o nome da
// matéria + módulos em accordion. Compartilhada pelo preview do cadastro e
// pela tela de edição — as ações ficam com quem usa.
export function ProgramStructureView({
  subjectName,
  modules,
}: {
  subjectName: string;
  modules: ReviewModule[];
}) {
  // Um módulo aberto por vez (padrão do Figma)
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-brand-border p-6">
      <h2 className="mb-5 text-sm tracking-wide text-brand-label uppercase">
        {subjectName}
      </h2>

      <div className="flex flex-col gap-3">
        {modules.map((module) => {
          const open = openKey === module.key;
          return (
            <article
              key={module.key}
              className="overflow-hidden rounded-xl border border-brand-border bg-white"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenKey((current) =>
                    current === module.key ? null : module.key,
                  )
                }
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm"
              >
                <span>{module.name}</span>
                <span className="shrink-0 text-brand-label" aria-hidden="true">
                  <svg
                    width="10"
                    height="8"
                    viewBox="0 0 13 11"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  >
                    <path
                      d="M7.06378 10.5C6.67888 11.1667 5.71663 11.1667 5.33173 10.5L0.135574 1.5C-0.249326 0.833332 0.2318 -2.67268e-07 1.0016 -1.9997e-07L11.3939 7.08554e-07C12.1637 7.75852e-07 12.6448 0.833334 12.2599 1.5L7.06378 10.5Z"
                      fill="#6B6B6B"
                    />
                  </svg>
                </span>
              </button>

              {open && (
                <div className="mx-6 mb-6 flex flex-col gap-3 rounded-xl bg-[#E8EAEA] px-5 py-4">
                  {module.topics.map((topic) => (
                    <div key={topic.key}>
                      <p className="text-sm font-medium">{topic.title}</p>
                      {topic.description.trim() !== "" && (
                        <p className="mt-1 text-sm whitespace-pre-line text-brand-label">
                          {topic.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
