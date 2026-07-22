"use client";

import { ChatBody } from "@/components/modules/chat/chat-body";
import { ExamBody } from "@/components/modules/exam/exam-body";
import { useStudentLearning } from "./student-context";

// Corpo do aprendizado do aluno (só o conteúdo — o header vive no StudentShell,
// no layout persistente). Lê modo + matéria do contexto e alterna estudo/exame.
export function StudentLearningBody() {
  const { subjects, studentName, mode, subjectId } = useStudentLearning();

  const subjectName =
    subjects.find((subject) => subject.id === subjectId)?.name ?? "";

  return (
    <div className="flex h-full flex-col px-10 pb-16 md:px-30">
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
