"use client";

import type { SubjectItem } from "@/lib/api/subject";
import { LearningModeSelector } from "@/components/ui/learning-mode-selector";
import { InlineSubjectSelect } from "@/components/ui/inline-subject-select";
import { PomodoroTimer } from "@/components/ui/pomodoro-timer";
import { TopbarIcons } from "@/components/ui/topbar-icons";

export type LearningMode = "study" | "exam";

// Header persistente da área do aluno. Vive no layout de /student, então nunca
// desmonta na troca de rota — por isso o Pomodoro (que lê o estado do
// PomodoroProvider) segue contando. O seletor de matéria só aparece no modo
// estudo/exame (rota /student); modo, timer e ícones aparecem sempre.
export function LearningHeader({
  mode,
  onModeChange,
  subjects,
  subjectId,
  onSubjectChange,
  showSubjectSelect,
}: {
  mode: LearningMode;
  onModeChange: (mode: LearningMode) => void;
  subjects: SubjectItem[];
  subjectId: string;
  onSubjectChange: (subjectId: string) => void;
  showSubjectSelect: boolean;
}) {
  return (
    <header className="grid grid-cols-3 items-center">
      <div className="justify-self-start">
        <LearningModeSelector
          mode={mode}
          subjectId={subjectId}
          onChange={onModeChange}
        />
      </div>

      <div className="justify-self-center">
        {showSubjectSelect && subjectId && (
          <InlineSubjectSelect
            subjects={subjects}
            selectedId={subjectId}
            onChange={onSubjectChange}
          />
        )}
      </div>

      <div className="flex items-center gap-4 justify-self-end">
        <PomodoroTimer />
        <TopbarIcons />
      </div>
    </header>
  );
}
