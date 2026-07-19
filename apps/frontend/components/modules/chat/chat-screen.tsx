"use client";

import { useState } from "react";
import type { SubjectItem } from "@/lib/api/subject";
import { SubjectPicker } from "./subject-picker";
import { ChatWindow } from "./chat-window";

// Raiz do Chat Modo Estudo. O chat é por TÓPICO: o aluno escolhe matéria + tópico
// (cascade). Só entra na janela com ambos definidos; trocar de matéria no header
// limpa o tópico e volta à seleção; trocar de tópico troca a conversa.
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

  const [subjectId, setSubjectId] = useState(
    validInitialSubject && initialSubjectId ? initialSubjectId : "",
  );
  const [topicId, setTopicId] = useState("");

  if (!subjectId || !topicId) {
    return (
      <div className="flex h-full flex-col">
        <SubjectPicker
          subjects={subjects}
          initialSubjectId={subjectId || undefined}
          onConfirm={(nextSubjectId, nextTopicId) => {
            setSubjectId(nextSubjectId);
            setTopicId(nextTopicId);
          }}
        />
      </div>
    );
  }

  return (
    <ChatWindow
      subjects={subjects}
      subjectId={subjectId}
      topicId={topicId}
      onSubjectChange={(nextSubjectId) => {
        // Trocar de matéria limpa o tópico → volta à seleção com a nova matéria
        setSubjectId(nextSubjectId);
        setTopicId("");
      }}
      onTopicChange={setTopicId}
    />
  );
}
