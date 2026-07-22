import { act, fireEvent, render, screen } from "@testing-library/react";
import { PomodoroTimer } from "./pomodoro-timer";
import { PomodoroProvider } from "@/components/providers/pomodoro-provider";
import { POMODORO_DURATIONS } from "@/lib/hooks/use-pomodoro";

jest.mock("@/lib/pomodoro/bell", () => ({ playBell: jest.fn() }));

// O timer agora lê seu estado do PomodoroProvider; envolvemos cada render nele
function renderTimer(props?: { drainAnimation?: boolean }) {
  return render(
    <PomodoroProvider>
      <PomodoroTimer {...props} />
    </PomodoroProvider>,
  );
}

function advanceSeconds(seconds: number) {
  act(() => {
    jest.advanceTimersByTime(seconds * 1000);
  });
}

describe("PomodoroTimer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("shows a full 25:00 focus label idle with a start control", () => {
    renderTimer();
    expect(screen.getByRole("timer")).toHaveAttribute(
      "aria-label",
      "Focus: 25:00",
    );
    expect(screen.getByLabelText("Iniciar")).toBeInTheDocument();
    // Sem skip durante o foco
    expect(screen.queryByLabelText("Saltar descanso")).not.toBeInTheDocument();
  });

  it("counts down and exposes a pause control once started", () => {
    renderTimer();
    fireEvent.click(screen.getByLabelText("Iniciar"));
    advanceSeconds(60);

    expect(screen.getByRole("timer")).toHaveAttribute(
      "aria-label",
      "Focus: 24:00",
    );
    expect(screen.getByLabelText("Pausar")).toBeInTheDocument();
  });

  it("reveals the skip control during a break and returns to focus", () => {
    renderTimer();
    fireEvent.click(screen.getByLabelText("Iniciar"));
    advanceSeconds(POMODORO_DURATIONS.focus);

    const skip = screen.getByLabelText("Saltar descanso");
    expect(skip).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveAttribute(
      "aria-label",
      "Descanso: 5:00",
    );

    fireEvent.click(skip);
    expect(screen.getByRole("timer")).toHaveAttribute(
      "aria-label",
      "Focus: 25:00",
    );
    expect(screen.queryByLabelText("Saltar descanso")).not.toBeInTheDocument();
  });

  it("keeps the pill full when the drain animation is disabled", () => {
    renderTimer({ drainAnimation: false });
    fireEvent.click(screen.getByLabelText("Iniciar"));
    advanceSeconds(POMODORO_DURATIONS.focus / 2);

    const fill = screen
      .getByRole("timer")
      .querySelector<HTMLElement>('[aria-hidden="true"]');
    expect(fill?.style.width).toBe("100%");
  });
});
