"use client";

import { useEffect } from "react";
import { useChatStream } from "@/lib/hooks/use-chat-stream";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { CHAT_TEXT } from "./chat.constants";

// Janela do chat. Não tem mais seletor de tópico: o tópico é escolhido no stage
// anterior e trocado pelo CTA "Cambiar temario", que devolve ao stage.
export function ChatWindow({
  subjectId,
  topicId,
  subjectName,
  topicTitle,
  studentName,
  onChangeTopic,
}: {
  subjectId: string;
  topicId: string;
  subjectName: string;
  topicTitle: string;
  studentName: string;
  onChangeTopic: () => void;
}) {
  const {
    messages,
    conversationId,
    loading,
    streaming,
    error,
    loadConversation,
    send,
  } = useChatStream();

  // Cada (matéria, tópico) é uma conversa distinta — trocar qualquer um recarrega
  useEffect(() => {
    void loadConversation(subjectId, topicId);
  }, [subjectId, topicId, loadConversation]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden pt-14">
      {/* Saudação com matéria + tópico em foco */}
      <h1 className="mb-10 text-center text-3xl font-medium leading-snug text-brand-label">
        {CHAT_TEXT.greeting(studentName)}
        <br />
        {CHAT_TEXT.greetingTopic(subjectName, topicTitle)}
      </h1>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-brand-placeholder">
          {CHAT_TEXT.loadingConversation}
        </div>
      ) : (
        <MessageList
          messages={messages}
          streaming={streaming}
          conversationId={conversationId}
        />
      )}

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="my-6 flex justify-center">
        <button
          type="button"
          onClick={onChangeTopic}
          className="flex items-center gap-2.5 rounded-lg bg-primary px-7 py-3.5 text-base font-medium text-primary-text transition-colors hover:bg-primary-hover"
        >
          <TopicIcon />
          {CHAT_TEXT.changeTopic}
        </button>
      </div>

      <div className="pb-2">
        <ChatInput
          onSend={(content) => void send(content)}
          disabled={streaming || loading}
        />
      </div>
    </div>
  );
}

function TopicIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M9 7h7" />
      <path d="M9 11h5" />
    </svg>
  );
}
