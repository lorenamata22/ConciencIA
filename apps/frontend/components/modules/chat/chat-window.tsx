"use client";

import { useEffect } from "react";
import { useChatStream } from "@/lib/hooks/use-chat-stream";
import type { SubjectItem } from "@/lib/api/subject";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { LearningModeSelector } from "@/components/ui/learning-mode-selector";
import { InlineSubjectSelect } from "@/components/ui/inline-subject-select";

export function ChatWindow({
  subjects,
  subjectId,
  onSubjectChange,
}: {
  subjects: SubjectItem[];
  subjectId: string;
  onSubjectChange: (subjectId: string) => void;
}) {
  const { messages, loading, streaming, error, loadConversation, send } =
    useChatStream();

  useEffect(() => {
    void loadConversation(subjectId);
  }, [subjectId, loadConversation]);

  const subjectName =
    subjects.find((subject) => subject.id === subjectId)?.name ?? "";

  return (
    <div className="flex h-full flex-col pt-10 px-10 md:px-30 pb-16">
      {/* Header: pill de modo à esquerda, seleção de matéria centralizada */}
      <div className="grid grid-cols-3 items-center">
        <div className="justify-self-start">
          <LearningModeSelector mode="study" subjectId={subjectId} />
        </div>

        <div className="justify-self-center">
          <InlineSubjectSelect
            subjects={subjects}
            selectedId={subjectId}
            onChange={onSubjectChange}
          />
        </div>
      </div>

      {/* Corpo: título da matéria enquanto vazio; mensagens quando houver */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-brand-placeholder">
            Cargando conversación…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <h1 className="text-3xl font-semibold text-brand-brown text-center">
              {subjectName}
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
