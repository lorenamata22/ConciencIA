"use client";

import { useEffect, useRef, useState } from "react";
import type { ExamModuleOutline } from "@/types/exam";

// Dropdown boxed de tópico (tela de seleção do chat), agrupado por módulo.
// Desabilitado até escolher matéria; mostra "Cargando temario..." enquanto busca.
export function ChatTopicSelect({
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
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled || loading}
        aria-expanded={open}
        aria-label="Seleccionar tema"
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
          open ? "border-brand-border-focus" : "border-brand-border"
        } ${selectedTitle ? "text-brand-brown" : "text-brand-placeholder"} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="truncate">{label}</span>
        <ChevronIcon open={open} />
      </button>

      {open && !disabled && !loading && (
        <div className="absolute top-full z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-brand-border bg-brand-bg py-2 shadow-lg">
          {modules.length === 0 ? (
            <p className="px-4 py-2.5 text-sm text-brand-placeholder">
              No hay temas disponibles.
            </p>
          ) : (
            modules.map((module) => (
              <section key={module.id} aria-label={module.name}>
                <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-brand-placeholder first:pt-1">
                  {module.name}
                </p>
                {module.topics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      onChange(topic.id);
                      setOpen(false);
                    }}
                    className={`block w-full px-6 py-2 text-left text-sm transition-colors hover:bg-brand-border/30 ${
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
      className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
