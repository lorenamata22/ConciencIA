"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type LearningMode = "study" | "exam";

const MODE_TRANSITION_MS = 600;

export function LearningModeSelector({
  mode,
  subjectId,
  onChange,
}: {
  mode: LearningMode;
  subjectId?: string;
  // Controlado: se fornecido, alterna o modo no lugar (sem navegar) — usado
  // quando estudo e exame vivem sob o mesmo header persistente. Sem ele, mantém
  // o comportamento antigo de navegar entre /student e /student/exam.
  onChange?: (mode: LearningMode) => void;
}) {
  const router = useRouter();
  const [visualMode, setVisualMode] = useState(mode);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const examMode = visualMode === "exam";

  useEffect(() => {
    setVisualMode(mode);
  }, [mode]);

  useEffect(
    () => () => {
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
    },
    [],
  );

  function toggleMode() {
    if (navigationTimer.current) return;

    const nextMode: LearningMode = examMode ? "study" : "exam";
    setVisualMode(nextMode);

    // Modo controlado: troca o corpo no lugar, o estado do timer sobrevive
    if (onChange) {
      onChange(nextMode);
      return;
    }

    const pathname = nextMode === "exam" ? "/student/exam" : "/student";
    const href = subjectId
      ? `${pathname}?subjectId=${encodeURIComponent(subjectId)}`
      : pathname;

    navigationTimer.current = setTimeout(() => {
      navigationTimer.current = null;
      router.push(href);
    }, MODE_TRANSITION_MS);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={examMode}
      aria-label={examMode ? "Modo Examen" : "Modo estudios"}
      onClick={toggleMode}
      className={`relative h-[30px] w-[204px] overflow-hidden rounded-full border text-[17px] font-medium transition-[background-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        examMode
          ? "border-primary bg-brand-bg text-primary"
          : "border-primary bg-primary text-primary-text shadow-sm"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-1 top-0.5 h-6 w-6 rounded-full border border-brand-border bg-white shadow-[0_2px_7px_rgba(0,0,0,0.18),inset_0_1px_2px_rgba(0,0,0,0.08)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          examMode ? "translate-x-[168px]" : "translate-x-0"
        }`}
      />

      <span
        aria-hidden={examMode}
        className={`absolute inset-y-0 left-9 right-2 flex items-center justify-center transition-all duration-300 ${
          examMode ? "translate-x-2 opacity-0" : "translate-x-0 opacity-100"
        }`}
      >
        Modo estudios
      </span>
      <span
        aria-hidden={!examMode}
        className={`absolute inset-y-0 left-2 right-9 flex items-center justify-center transition-all duration-300 ${
          examMode ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
        }`}
      >
        Modo Examen
      </span>
    </button>
  );
}
