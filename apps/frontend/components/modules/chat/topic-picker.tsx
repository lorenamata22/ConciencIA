"use client";

import type { ExamModuleOutline } from "@/types/exam";
import { ChatTopicSelect } from "./topic-select";
import { CHAT_TEXT } from "./chat.constants";

// Stage de seleção de tópico do Modo Estudo — espelha o stage "selecting_topic"
// do Modo Exame. A matéria já está escolhida (vive no header), aqui só o temario.
export function TopicPicker({
  subjectName,
  modules,
  selectedTopicId,
  loading,
  onSelect,
  onConfirm,
}: {
  subjectName: string;
  modules: ExamModuleOutline[];
  selectedTopicId: string;
  loading: boolean;
  onSelect: (topicId: string) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center">
      <h1 className="mb-10 text-center text-3xl font-medium text-brand-label sm:text-4xl">
        {CHAT_TEXT.topicStageTitle(subjectName)}
      </h1>

      <div className="flex w-full max-w-[490px] flex-col items-center">
        <ChatTopicSelect
          modules={modules}
          selectedId={selectedTopicId}
          onChange={onSelect}
          loading={loading}
        />

        <button
          type="button"
          onClick={onConfirm}
          disabled={!selectedTopicId || loading}
          className="mt-10 rounded-xl bg-primary px-9 py-3.5 text-base font-semibold text-primary-text transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {CHAT_TEXT.confirm}
        </button>
      </div>
    </div>
  );
}
