"use client";

import { useState } from "react";
import type { SubjectItem } from "@/lib/api/subject";
import { LearningHeader, type LearningMode } from "./learning-header";
import { ChatBody } from "@/components/modules/chat/chat-body";
import { ExamBody } from "@/components/modules/exam/exam-body";

// Raiz do aprendizado do aluno. Dona do modo (estudo|exame) e da matéria.
// O header é sempre o mesmo e NÃO desmonta na troca de modo — só o corpo troca —
// então o timer Pomodoro dentro do header preserva seu estado entre os modos.
export function StudentLearningScreen({
  subjects,
  initialSubjectId,
  initialMode = "study",
  studentName,
}: {
  subjects: SubjectItem[];
  initialSubjectId?: string;
  initialMode?: LearningMode;
  studentName: string;
}) {
  const firstSubjectId =
    subjects.find((subject) => subject.id === initialSubjectId)?.id ??
    subjects[0]?.id ??
    "";

  const [mode, setMode] = useState<LearningMode>(initialMode);
  const [subjectId, setSubjectId] = useState(firstSubjectId);

  const subjectName =
    subjects.find((subject) => subject.id === subjectId)?.name ?? "";

  return (
    <div className="flex h-full flex-col px-10 pt-10 pb-16 md:px-30">
      <LearningHeader
        mode={mode}
        onModeChange={setMode}
        subjects={subjects}
        subjectId={subjectId}
        onSubjectChange={setSubjectId}
      />

      {mode === "study" ? (
        <ChatBody
          subjectId={subjectId}
          subjectName={subjectName}
          studentName={studentName}
        />
      ) : (
        <ExamBody
          subjectId={subjectId}
          subjectName={subjectName}
          studentName={studentName}
        />
      )}
    </div>
  );
}
