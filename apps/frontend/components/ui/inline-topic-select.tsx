"use client";

import { useEffect, useRef, useState } from "react";
import type { ExamModuleOutline } from "@/types/exam";

// Seletor de tópico inline (header do chat) — mesmo padrão do InlineSubjectSelect,
// mas agrupado por módulo. Desabilitado até haver matéria/temas.
export function InlineTopicSelect({
  modules,
  selectedId,
  onChange,
  disabled = false,
  loading = false,
}: {
  modules: ExamModuleOutline[];
  selectedId: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const selectedTitle = modules
    .flatMap((module) => module.topics)
    .find((topic) => topic.id === selectedId)?.title;

  const label = loading
    ? "Cargando temario..."
    : (selectedTitle ?? "Elegir tema");

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled || loading}
        aria-expanded={open}
        aria-label="Seleccionar tema"
        className="flex min-w-36 items-center justify-center gap-1.5 border-b border-brand-brown/40 pb-1 text-base text-brand-brown disabled:opacity-50"
      >
        <span className="truncate">{label}</span>
        <ChevronIcon open={open} />
      </button>

      {open && !disabled && !loading && (
        <div className="absolute left-1/2 top-full z-50 mt-2 max-h-72 w-64 -translate-x-1/2 overflow-y-auto rounded-2xl border border-brand-border bg-brand-bg py-2 shadow-lg">
          {modules.length === 0 ? (
            <p className="px-5 py-2.5 text-sm text-brand-placeholder">
              No hay temas disponibles.
            </p>
          ) : (
            modules.map((module) => (
              <section key={module.id} aria-label={module.name}>
                <p className="px-5 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-brand-placeholder first:pt-1">
                  {module.name}
                </p>
                {module.topics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (topic.id !== selectedId) onChange(topic.id);
                    }}
                    className={`block w-full px-7 py-2 text-left text-sm transition-colors hover:bg-brand-border/30 ${
                      topic.id === selectedId
                        ? "font-medium text-brand-brown"
                        : "text-brand-brown"
                    }`}
                  >
                    {topic.title}
                  </button>
                ))}
              </section>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
