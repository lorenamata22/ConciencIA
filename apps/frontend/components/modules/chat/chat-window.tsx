"use client";

import { useEffect, useState } from "react";
import { useChatStream } from "@/lib/hooks/use-chat-stream";
import type { SubjectItem } from "@/lib/api/subject";
import { getExamOutline } from "@/lib/api/exams";
import type { ExamModuleOutline } from "@/types/exam";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { LearningModeSelector } from "@/components/ui/learning-mode-selector";
import { InlineSubjectSelect } from "@/components/ui/inline-subject-select";
import { InlineTopicSelect } from "@/components/ui/inline-topic-select";

export function ChatWindow({
  subjects,
  subjectId,
  topicId,
  onSubjectChange,
  onTopicChange,
}: {
  subjects: SubjectItem[];
  subjectId: string;
  topicId: string;
  onSubjectChange: (subjectId: string) => void;
  onTopicChange: (topicId: string) => void;
}) {
  const { messages, loading, streaming, error, loadConversation, send } =
    useChatStream();

  const [modules, setModules] = useState<ExamModuleOutline[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Temario da matéria — alimenta o seletor de tópico no header
  useEffect(() => {
    let active = true;
    setLoadingTopics(true);
    getExamOutline(subjectId)
      .then((outline) => {
        if (active) setModules(outline);
      })
      .catch(() => {
        if (active) setModules([]);
      })
      .finally(() => {
        if (active) setLoadingTopics(false);
      });
    return () => {
      active = false;
    };
  }, [subjectId]);

  // Cada (matéria, tópico) é uma conversa distinta — trocar qualquer um recarrega
  useEffect(() => {
    void loadConversation(subjectId, topicId);
  }, [subjectId, topicId, loadConversation]);

  const topicTitle =
    modules
      .flatMap((module) => module.topics)
      .find((topic) => topic.id === topicId)?.title ?? "";

  return (
    <div className="flex h-full flex-col px-10 pt-10 pb-16 md:px-30">
      {/* Header: pill de modo à esquerda, cascade matéria + tópico centralizada */}
      <div className="grid grid-cols-3 items-center">
        <div className="justify-self-start">
          <LearningModeSelector mode="study" subjectId={subjectId} />
        </div>

        <div className="flex items-center gap-3 justify-self-center">
          <InlineSubjectSelect
            subjects={subjects}
            selectedId={subjectId}
            onChange={onSubjectChange}
          />
          <span className="text-brand-brown/30" aria-hidden="true">
            /
          </span>
          <InlineTopicSelect
            modules={modules}
            selectedId={topicId}
            onChange={onTopicChange}
            loading={loadingTopics}
          />
        </div>
      </div>

      {/* Corpo: título do tópico enquanto vazio; mensagens quando houver */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-brand-placeholder">
            Cargando conversación…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <h1 className="text-center text-3xl font-semibold text-brand-brown">
              {topicTitle}
            </h1>
          </div>
        ) : (
          <MessageList messages={messages} streaming={streaming} />
        )}

        {error && (
          <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="pb-2">
          <ChatInput
            onSend={(content) => void send(content)}
            disabled={streaming || loading}
          />
        </div>
      </div>
    </div>
  );
}
