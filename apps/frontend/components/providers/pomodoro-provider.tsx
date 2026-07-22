"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePomodoro, type PomodoroController } from "@/lib/hooks/use-pomodoro";

// Estado do Pomodoro isolado num provider montado no layout autenticado
// (app/(app)/layout.tsx). Como esse layout não desmonta ao navegar entre
// /student/* e /calendar, a contagem persiste mesmo quando a UI do timer
// (renderizada só no header do aluno) desmonta na troca de rota.
const PomodoroContext = createContext<PomodoroController | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const controller = usePomodoro();
  return (
    <PomodoroContext.Provider value={controller}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoroController(): PomodoroController {
  const controller = useContext(PomodoroContext);
  if (!controller) {
    throw new Error("usePomodoroController deve ser usado dentro de PomodoroProvider");
  }
  return controller;
}
