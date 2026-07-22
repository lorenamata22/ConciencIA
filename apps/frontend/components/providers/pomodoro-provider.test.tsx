import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useState } from "react";
import {
  PomodoroProvider,
  usePomodoroController,
} from "./pomodoro-provider";
import { PomodoroTimer } from "@/components/ui/pomodoro-timer";

jest.mock("@/lib/pomodoro/bell", () => ({ playBell: jest.fn() }));

function advanceSeconds(seconds: number) {
  act(() => {
    jest.advanceTimersByTime(seconds * 1000);
  });
}

describe("PomodoroProvider", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // Núcleo do pedido: o estado vive no provider (montado no layout autenticado),
  // então a UI do timer pode desmontar (ex.: sair da área do aluno para o
  // calendário) e remontar sem que a contagem resete.
  it("keeps counting while the timer UI unmounts and remounts", () => {
    function Harness() {
      const [showTimer, setShowTimer] = useState(true);
      return (
        <PomodoroProvider>
          {showTimer && <PomodoroTimer />}
          <button type="button" onClick={() => setShowTimer((v) => !v)}>
            toggle
          </button>
        </PomodoroProvider>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Iniciar"));
    advanceSeconds(60);
    expect(screen.getByRole("timer")).toHaveAttribute(
      "aria-label",
      "Focus: 24:00",
    );

    // Desmonta a UI (troca de rota para fora do header), tempo segue correndo
    fireEvent.click(screen.getByText("toggle"));
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    advanceSeconds(60);

    // Remonta a UI: a contagem seguiu, não resetou para 25:00
    fireEvent.click(screen.getByText("toggle"));
    expect(screen.getByRole("timer")).toHaveAttribute(
      "aria-label",
      "Focus: 23:00",
    );
  });

  it("throws when the controller is used outside the provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => usePomodoroController())).toThrow();
    spy.mockRestore();
  });
});
