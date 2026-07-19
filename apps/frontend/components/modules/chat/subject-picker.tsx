"use client";

import { useEffect, useState } from "react";
import { ObjectSelect } from "@/components/ui/form";
import type { SubjectItem } from "@/lib/api/subject";
import { getExamOutline } from "@/lib/api/exams";
import type { ExamModuleOutline } from "@/types/exam";
import { ChatTopicSelect } from "./topic-select";

// Seleção em cascata antes de entrar no chat: Matéria → Tópico.
// O tópico fica desabilitado até escolher matéria; trocar de matéria limpa o
// tópico e recarrega o temario. O chat só abre com tópico escolhido.
export function SubjectPicker({
  subjects,
  initialSubjectId,
  onConfirm,
}: {
  subjects: SubjectItem[];
  initialSubjectId?: string;
  onConfirm: (subjectId: string, topicId: string) => void;
}) {
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? "");
  const [topicId, setTopicId] = useState("");
  const [modules, setModules] = useState<ExamModuleOutline[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    if (!subjectId) {
      setModules([]);
      return;
    }
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

  function handleSubjectChange(id: string) {
    setSubjectId(id);
    setTopicId(""); // trocar de matéria limpa a seleção de tópico
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <h1 className="mb-8 text-center text-3xl font-semibold text-brand-brown">
        ¿Qué estudiamos hoy?
      </h1>

      <div className="flex w-full max-w-md flex-col gap-4">
        <ObjectSelect
          name="subject"
          placeholder="Elegir asignatura"
          defaultValue={subjectId}
          options={subjects.map((subject) => ({
            id: subject.id,
            label: subject.name,
          }))}
          onChange={handleSubjectChange}
        />

        <ChatTopicSelect
          modules={modules}
          selectedId={topicId}
          onChange={setTopicId}
          disabled={!subjectId}
          loading={loadingTopics}
        />
      </div>

      <button
        type="button"
        disabled={!subjectId || !topicId}
        onClick={() => onConfirm(subjectId, topicId)}
        className="mt-8 rounded-xl bg-primary px-8 py-3 text-sm font-medium text-primary-text transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        Empezar
      </button>
    </div>
  );
}
