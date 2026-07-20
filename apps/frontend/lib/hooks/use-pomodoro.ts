"use client";

import { useEffect, useReducer } from "react";
import { playBell } from "@/lib/pomodoro/bell";

// Técnica Pomodoro: blocos de foco de 25min separados por pausas de 5min; a cada
// 4 focos, uma pausa longa de 15min. Sem persistência — estado só em memória.
export const POMODORO_DURATIONS = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
} as const;

export const FOCUS_SESSIONS_BEFORE_LONG_BREAK = 4;

export type PomodoroPhase = keyof typeof POMODORO_DURATIONS;

interface PomodoroState {
  phase: PomodoroPhase;
  secondsLeft: number;
  running: boolean;
  started: boolean;
  // Focos concluídos — decide pausa curta vs. longa (múltiplos de 4 → longa)
  completedFocus: number;
  // Incrementa a cada término natural de ciclo; dispara o sino num efeito
  bellToken: number;
}

type PomodoroAction =
  | { type: "start" }
  | { type: "toggle" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "skip_break" }
  | { type: "tick" };

const initialState: PomodoroState = {
  phase: "focus",
  secondsLeft: POMODORO_DURATIONS.focus,
  running: false,
  started: false,
  completedFocus: 0,
  bellToken: 0,
};

function startState(): PomodoroState {
  return {
    ...initialState,
    started: true,
    running: true,
  };
}

// Decide a próxima fase quando um ciclo termina naturalmente (não no skip).
function advancePhase(state: PomodoroState): PomodoroState {
  if (state.phase === "focus") {
    const completedFocus = state.completedFocus + 1;
    const isLongBreak = completedFocus % FOCUS_SESSIONS_BEFORE_LONG_BREAK === 0;
    const phase: PomodoroPhase = isLongBreak ? "long_break" : "short_break";
    return {
      ...state,
      phase,
      secondsLeft: POMODORO_DURATIONS[phase],
      completedFocus,
      bellToken: state.bellToken + 1,
    };
  }

  // Fim de qualquer pausa → volta ao foco
  return {
    ...state,
    phase: "focus",
    secondsLeft: POMODORO_DURATIONS.focus,
    bellToken: state.bellToken + 1,
  };
}

function reducer(state: PomodoroState, action: PomodoroAction): PomodoroState {
  switch (action.type) {
    case "start":
      return startState();
    case "toggle":
      return state.started
        ? { ...state, running: !state.running }
        : startState();
    case "pause":
      return { ...state, running: false };
    case "resume":
      return state.started ? { ...state, running: true } : state;
    case "skip_break":
      // Só faz sentido durante uma pausa; pula o restante sem tocar o sino
      if (state.phase === "focus") return state;
      return {
        ...state,
        phase: "focus",
        secondsLeft: POMODORO_DURATIONS.focus,
      };
    case "tick": {
      if (!state.running) return state;
      if (state.secondsLeft > 1) {
        return { ...state, secondsLeft: state.secondsLeft - 1 };
      }
      return advancePhase(state);
    }
    default:
      return state;
  }
}

export interface PomodoroController {
  phase: PomodoroPhase;
  secondsLeft: number;
  running: boolean;
  started: boolean;
  isBreak: boolean;
  // Fração 0..1 restante da fase atual — alimenta a animação de "descarga"
  progress: number;
  start: () => void;
  toggle: () => void;
  pause: () => void;
  resume: () => void;
  skipBreak: () => void;
}

export function usePomodoro(): PomodoroController {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Um único intervalo enquanto está rodando
  useEffect(() => {
    if (!state.running) return;
    const interval = setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => clearInterval(interval);
  }, [state.running]);

  // Toca o sino a cada término natural de ciclo (skip não incrementa o token)
  useEffect(() => {
    if (state.bellToken === 0) return;
    playBell();
  }, [state.bellToken]);

  const total = POMODORO_DURATIONS[state.phase];

  return {
    phase: state.phase,
    secondsLeft: state.secondsLeft,
    running: state.running,
    started: state.started,
    isBreak: state.phase !== "focus",
    progress: state.secondsLeft / total,
    start: () => dispatch({ type: "start" }),
    toggle: () => dispatch({ type: "toggle" }),
    pause: () => dispatch({ type: "pause" }),
    resume: () => dispatch({ type: "resume" }),
    skipBreak: () => dispatch({ type: "skip_break" }),
  };
}
