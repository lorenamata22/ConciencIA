"use client";

import { useState } from "react";
import type { SubjectItem } from "@/lib/api/subject";
import { SubjectPicker } from "./subject-picker";
import { ChatWindow } from "./chat-window";

// Seleção preparada para o passo futuro de tópico (topicId opcional) —
// quando o módulo de tópicos existir, o picker ganha uma etapa a mais
interface ChatSelection {
  subjectId: string;
  topicId?: string;
}

// Raiz do Chat Modo Estudo: alterna entre a seleção de matéria e a janela
// de chat; trocar de matéria no header do chat recarrega a conversa
export function ChatScreen({
  subjects,
  initialSubjectId,
}: {
  subjects: SubjectItem[];
  initialSubjectId?: string;
}) {
  const validInitialSubject = subjects.some(
    (subject) => subject.id === initialSubjectId,
  );
  const [selection, setSelection] = useState<ChatSelection | null>(
    validInitialSubject && initialSubjectId
      ? { subjectId: initialSubjectId }
      : null,
  );

  if (!selection) {
    return (
      <div className="flex h-full flex-col">
        <SubjectPicker
          subjects={subjects}
          onConfirm={(subjectId) => setSelection({ subjectId })}
        />
      </div>
    );
  }

  return (
    <ChatWindow
      subjects={subjects}
      subjectId={selection.subjectId}
      onSubjectChange={(subjectId) => setSelection({ subjectId })}
    />
  );
}
