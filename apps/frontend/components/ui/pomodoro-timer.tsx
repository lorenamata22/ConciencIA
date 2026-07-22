"use client";

import { type PomodoroPhase } from "@/lib/hooks/use-pomodoro";
import { usePomodoroController } from "@/components/providers/pomodoro-provider";

const PHASE_LABEL: Record<PomodoroPhase, string> = {
  focus: "Focus",
  short_break: "Descanso",
  long_break: "Descanso largo",
};

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Timer Pomodoro do header (Figma: pílula escura "Focus: 15:30" + botão).
//
// Animação de "descarga de bateria": o fundo preto vai esvaziando da direita
// para a esquerda conforme o tempo cai; a parte esvaziada fica transparente com
// borda preta. O texto contrasta acompanhando exatamente a mesma linha do
// preenchimento — duas cópias idênticas (base preta + cópia branca recortada
// pela largura do fill). `drainAnimation={false}` mantém a pílula sempre cheia.
export function PomodoroTimer({
  drainAnimation = true,
}: {
  drainAnimation?: boolean;
}) {
  const timer = usePomodoroController();
  const { started, running, isBreak, progress } = timer;

  const label = `${PHASE_LABEL[timer.phase]}: ${formatTime(timer.secondsLeft)}`;
  // Sem animação (ou antes de começar) a pílula fica cheia — visual da referência
  const fillPercent = drainAnimation && started ? progress * 100 : 100;

  return (
    <div
      className="relative flex h-9 w-[188px] items-center overflow-hidden rounded-full border border-black"
      role="timer"
      aria-label={label}
    >
      {/* Preenchimento preto que "descarrega" */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-black transition-[width] duration-1000 ease-linear"
        style={{ width: `${fillPercent}%` }}
      />

      {/* Camada base: texto preto (visível sobre a área transparente) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 flex w-[188px] items-center pl-4 text-sm font-medium text-black"
      >
        {label}
      </span>

      {/* Camada branca recortada pela largura do fill (visível sobre o preto) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-1000 ease-linear"
        style={{ width: `${fillPercent}%` }}
      >
        <span className="absolute inset-y-0 left-0 flex w-[188px] items-center pl-4 text-sm font-medium text-white">
          {label}
        </span>
      </span>

      {/* Controles à direita, acima das camadas de texto */}
      <div className="absolute inset-y-0 right-1 flex items-center gap-1">
        {isBreak && (
          <button
            type="button"
            onClick={timer.skipBreak}
            aria-label="Saltar descanso"
            className="flex h-7 items-center rounded-full bg-white/90 px-3 text-xs font-medium text-black transition-colors hover:bg-white"
          >
            Saltar
          </button>
        )}
        <button
          type="button"
          onClick={timer.toggle}
          aria-label={!started ? "Iniciar" : running ? "Pausar" : "Reanudar"}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-700 text-white transition-colors hover:bg-neutral-600"
        >
          {started && running ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
