"use client";

import type { SubjectItem } from "@/lib/api/subject";
import { LearningModeSelector } from "@/components/ui/learning-mode-selector";
import { InlineSubjectSelect } from "@/components/ui/inline-subject-select";
import { PomodoroTimer } from "@/components/ui/pomodoro-timer";

export type LearningMode = "study" | "exam";

// Header compartilhado por Modo Estudo e Modo Exame. É sempre o mesmo componente:
// só o corpo abaixo muda. Por não desmontar na troca de modo, o timer Pomodoro
// à direita mantém seu estado entre estudo e exame.
export function LearningHeader({
  mode,
  onModeChange,
  subjects,
  subjectId,
  onSubjectChange,
}: {
  mode: LearningMode;
  onModeChange: (mode: LearningMode) => void;
  subjects: SubjectItem[];
  subjectId: string;
  onSubjectChange: (subjectId: string) => void;
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
        {subjectId && (
          <InlineSubjectSelect
            subjects={subjects}
            selectedId={subjectId}
            onChange={onSubjectChange}
          />
        )}
      </div>

      <div className="justify-self-end">
        <PomodoroTimer />
      </div>
    </header>
  );
}
