"use client";

import { useEffect, useRef, useState } from "react";
import type { ExamModuleOutline } from "@/types/exam";
import { EXAM_TEXT } from "./exam.constants";

export function TopicSelector({
  modules,
  selectedTopicId,
  loading,
  onSelect,
  onConfirm,
}: {
  modules: ExamModuleOutline[];
  selectedTopicId: string;
  loading: boolean;
  onSelect: (topicId: string) => void;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedTopic = modules
    .flatMap((module) => module.topics)
    .find((topic) => topic.id === selectedTopicId);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div className="flex w-full max-w-[490px] flex-col items-center">
      <div ref={containerRef} className="relative w-full">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          disabled={loading}
          aria-expanded={open}
          className="flex h-[54px] w-full items-center justify-between rounded-2xl border border-brand-border bg-white px-5 text-left text-base text-brand-label shadow-sm disabled:cursor-wait disabled:opacity-60"
        >
          <span className="truncate">
            {loading
              ? "Cargando temario..."
              : (selectedTopic?.title ?? EXAM_TEXT.topicPlaceholder)}
          </span>
          <ChevronIcon open={open} />
        </button>

        {open && !loading && (
          <div className="absolute top-full z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-brand-border bg-white py-2 shadow-lg">
            {modules.length === 0 ? (
              <p className="px-5 py-3 text-sm text-brand-placeholder">
                No hay temas disponibles.
              </p>
            ) : (
              modules.map((module) => (
                <section key={module.id} aria-label={module.name}>
                  <p className="px-5 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-brand-placeholder first:pt-1">
                    {module.name}
                  </p>
                  {module.topics.length === 0 ? (
                    <p className="px-7 py-2 text-sm text-brand-placeholder">
                      Sin temas
                    </p>
                  ) : (
                    module.topics.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          onSelect(topic.id);
                          setOpen(false);
                        }}
                        className={`block w-full px-7 py-2.5 text-left text-sm transition-colors hover:bg-primary/10 ${
                          topic.id === selectedTopicId
                            ? "font-medium text-primary"
                            : "text-brand-brown"
                        }`}
                      >
                        {topic.title}
                      </button>
                    ))
                  )}
                </section>
              ))
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={!selectedTopicId || loading}
        className="mt-10 rounded-xl bg-primary px-9 py-3.5 text-base font-semibold text-primary-text transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {EXAM_TEXT.confirm}
      </button>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`transition-transform ${open ? "rotate-180" : ""}`}
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
