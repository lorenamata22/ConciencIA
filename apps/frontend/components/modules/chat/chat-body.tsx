"use client";

import { useEffect, useState } from "react";
import { getExamOutline } from "@/lib/api/exams";
import type { ExamModuleOutline } from "@/types/exam";
import { TopicPicker } from "./topic-picker";
import { ChatWindow } from "./chat-window";

type ChatStage = "selecting_topic" | "chatting";

// Corpo do Chat Modo Estudo (sem header — o header vive no StudentShell).
// Espelha o Modo Exame: escolha de tópico é um stage próprio, separado da janela.
// Trocar de matéria (via header) reseta ao stage de seleção com o novo temario.
export function ChatBody({
  subjectId,
  subjectName,
  studentName,
}: {
  subjectId: string;
  subjectName: string;
  studentName: string;
}) {
  const [topicId, setTopicId] = useState("");
  const [stage, setStage] = useState<ChatStage>("selecting_topic");
  const [modules, setModules] = useState<ExamModuleOutline[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(Boolean(subjectId));

  // Temario da matéria — trocar de matéria recarrega e volta à seleção de tópico
  useEffect(() => {
    if (!subjectId) {
      setModules([]);
      setLoadingTopics(false);
      return;
    }

    let active = true;
    setLoadingTopics(true);
    setStage("selecting_topic");
    setTopicId("");
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

  const topicTitle =
    modules
      .flatMap((module) => module.topics)
      .find((topic) => topic.id === topicId)?.title ?? "";

  if (stage === "selecting_topic") {
    return (
      <main className="mx-auto flex w-full max-w-[712px] flex-1 flex-col pt-14 lg:pt-36">
        <TopicPicker
          subjectName={subjectName}
          modules={modules}
          selectedTopicId={topicId}
          loading={loadingTopics}
          onSelect={setTopicId}
          onConfirm={() => setStage("chatting")}
        />
      </main>
    );
  }

  return (
    <ChatWindow
      subjectId={subjectId}
      topicId={topicId}
      subjectName={subjectName}
      topicTitle={topicTitle}
      studentName={studentName}
      onChangeTopic={() => setStage("selecting_topic")}
    />
  );
}
