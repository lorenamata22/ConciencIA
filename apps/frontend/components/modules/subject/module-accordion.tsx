"use client";

import { inputClass } from "@/components/ui/form";
import { TopicEditor } from "./topic-editor";
import type { ReviewModule, ReviewTopic } from "./review-state";

// Accordion controlado (um aberto por vez, gerido pelo container): título
// editável + tópicos + adicionar tema + remover módulo.
export function ModuleAccordion({
  module,
  index,
  open,
  onToggle,
  onRename,
  onRemove,
  onAddTopic,
  onRemoveTopic,
  onTopicChange,
}: {
  module: ReviewModule;
  index: number;
  open: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onAddTopic: () => void;
  onRemoveTopic: (topicKey: string) => void;
  onTopicChange: (
    topicKey: string,
    patch: Partial<Pick<ReviewTopic, "title" | "description">>,
  ) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-brand-border bg-white mb-5">
      <div className="flex items-center gap-3 px-5 pt-3 mb-1">
        <p className="text-sm">Módulo</p>
      </div>
      <div className="flex items-center gap-3 px-5 pb-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${open ? "Contraer" : "Expandir"} módulo ${index + 1}`}
          className="shrink-0 text-xl text-brand-label"
        >
          <svg width="10" height="8" viewBox="0 0 13 11" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <path d="M7.06378 10.5C6.67888 11.1667 5.71663 11.1667 5.33173 10.5L0.135574 1.5C-0.249326 0.833332 0.2318 -2.67268e-07 1.0016 -1.9997e-07L11.3939 7.08554e-07C12.1637 7.75852e-07 12.6448 0.833334 12.2599 1.5L7.06378 10.5Z" fill="#6B6B6B"/>
          </svg>

        </button>
        <input
          type="text"
          value={module.name}
          onChange={(event) => onRename(event.target.value)}
          placeholder="Nombre del módulo"
          aria-label={`Nombre del módulo ${index + 1}`}
          className={`${inputClass} font-medium`}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Eliminar módulo ${index + 1}`}
          className="shrink-0 text-sm text-brand-placeholder transition-colors hover:text-red-500"
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

      {open && (
        <div className="flex flex-col gap-3 px-5 py-4">
          {module.topics.map((topic, topicIndex) => (
            <TopicEditor
              key={topic.key}
              topic={topic}
              index={topicIndex}
              onChange={(patch) => onTopicChange(topic.key, patch)}
              onRemove={() => onRemoveTopic(topic.key)}
            />
          ))}

          <button
            type="button"
            onClick={onAddTopic}
            className="w-fit rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-label transition-colors hover:bg-brand-border/30"
          >
            + Añadir temario
          </button>
        </div>
      )}
    </article>
  );
}
