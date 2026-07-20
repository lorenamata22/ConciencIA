import { act, fireEvent, render, screen } from "@testing-library/react";
import { PomodoroTimer } from "./pomodoro-timer";
import { POMODORO_DURATIONS } from "@/lib/hooks/use-pomodoro";

jest.mock("@/lib/pomodoro/bell", () => ({ playBell: jest.fn() }));

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
    render(<PomodoroTimer />);
    expect(screen.getByRole("timer")).toHaveAttribute(
      "aria-label",
      "Focus: 25:00",
    );
    expect(screen.getByLabelText("Iniciar")).toBeInTheDocument();
    // Sem skip durante o foco
    expect(screen.queryByLabelText("Saltar descanso")).not.toBeInTheDocument();
  });

  it("counts down and exposes a pause control once started", () => {
    render(<PomodoroTimer />);
    fireEvent.click(screen.getByLabelText("Iniciar"));
    advanceSeconds(60);

    expect(screen.getByRole("timer")).toHaveAttribute(
      "aria-label",
      "Focus: 24:00",
    );
    expect(screen.getByLabelText("Pausar")).toBeInTheDocument();
  });

  it("reveals the skip control during a break and returns to focus", () => {
    render(<PomodoroTimer />);
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
    render(<PomodoroTimer drainAnimation={false} />);
    fireEvent.click(screen.getByLabelText("Iniciar"));
    advanceSeconds(POMODORO_DURATIONS.focus / 2);

    const fill = screen
      .getByRole("timer")
      .querySelector<HTMLElement>('[aria-hidden="true"]');
    expect(fill?.style.width).toBe("100%");
  });
});
