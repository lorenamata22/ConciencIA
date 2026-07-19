"use client";

import { inputClass } from "@/components/ui/form";
import type { ReviewTopic } from "./review-state";

// Editor de um tópico: título + conteúdo (texto puro) + remover. Badge
// "sin contenido" quando a ementa está vazia (não bloqueia o registro).
export function TopicEditor({
  topic,
  index,
  onChange,
  onRemove,
}: {
  topic: ReviewTopic;
  index: number;
  onChange: (patch: Partial<Pick<ReviewTopic, "title" | "description">>) => void;
  onRemove: () => void;
}) {
  const isEmpty = topic.description.trim() === "";

  return (
    <div className="rounded-xl border border-brand-border p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm">Temario</p>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Eliminar tema ${index + 1}`}
          className="shrink-0 text-brand-placeholder transition-colors hover:text-red-500"
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
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
      <div className="mb-2 flex items-center ">
        <input
          type="text"
          value={topic.title}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="Título del tema"
          aria-label={`Título del tema ${index + 1}`}
          className={inputClass}
        />
        {isEmpty && (
          <span className="shrink-0 rounded-full bg-brand-border/40 px-2.5 py-1 text-xs font-medium text-brand-label">
            sin contenido
          </span>
        )}
        
      </div>
      <textarea
        value={topic.description}
        onChange={(event) => onChange({ description: event.target.value })}
        placeholder="Contenido del tema (temario)"
        aria-label={`Contenido del tema ${index + 1}`}
        rows={3}
        className={`${inputClass} resize-y`}
      />
    </div>
  );
}
