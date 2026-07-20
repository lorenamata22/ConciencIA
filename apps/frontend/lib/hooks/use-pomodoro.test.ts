import { act, renderHook } from "@testing-library/react";
import { usePomodoro, POMODORO_DURATIONS } from "./use-pomodoro";
import { playBell } from "@/lib/pomodoro/bell";

jest.mock("@/lib/pomodoro/bell", () => ({ playBell: jest.fn() }));

const mockedBell = jest.mocked(playBell);

// Avança o timer fake em `seconds` disparos de 1s (envoltos em act)
function advanceSeconds(seconds: number) {
  act(() => {
    jest.advanceTimersByTime(seconds * 1000);
  });
}

describe("usePomodoro", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedBell.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("starts idle on a full 25-minute focus phase", () => {
    const { result } = renderHook(() => usePomodoro());
    expect(result.current.phase).toBe("focus");
    expect(result.current.secondsLeft).toBe(POMODORO_DURATIONS.focus);
    expect(result.current.running).toBe(false);
    expect(result.current.started).toBe(false);
    expect(result.current.progress).toBe(1);
  });

  it("does not tick until started", () => {
    const { result } = renderHook(() => usePomodoro());
    advanceSeconds(10);
    expect(result.current.secondsLeft).toBe(POMODORO_DURATIONS.focus);
  });

  it("counts down once running", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());
    advanceSeconds(5);
    expect(result.current.running).toBe(true);
    expect(result.current.secondsLeft).toBe(POMODORO_DURATIONS.focus - 5);
  });

  it("rings the bell and moves to a short break when focus ends", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());
    advanceSeconds(POMODORO_DURATIONS.focus);

    expect(result.current.phase).toBe("short_break");
    expect(result.current.secondsLeft).toBe(POMODORO_DURATIONS.short_break);
    expect(result.current.isBreak).toBe(true);
    expect(mockedBell).toHaveBeenCalledTimes(1);
  });

  it("returns to focus and rings again when the break ends", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());
    advanceSeconds(POMODORO_DURATIONS.focus);
    advanceSeconds(POMODORO_DURATIONS.short_break);

    expect(result.current.phase).toBe("focus");
    expect(mockedBell).toHaveBeenCalledTimes(2);
  });

  it("takes a long break after four focus sessions", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());

    for (let session = 1; session <= 3; session += 1) {
      advanceSeconds(POMODORO_DURATIONS.focus);
      expect(result.current.phase).toBe("short_break");
      advanceSeconds(POMODORO_DURATIONS.short_break);
    }
    advanceSeconds(POMODORO_DURATIONS.focus);

    expect(result.current.phase).toBe("long_break");
    expect(result.current.secondsLeft).toBe(POMODORO_DURATIONS.long_break);
  });

  it("skips the break back to focus without ringing", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());
    advanceSeconds(POMODORO_DURATIONS.focus);
    expect(result.current.phase).toBe("short_break");
    mockedBell.mockClear();

    act(() => result.current.skipBreak());
    expect(result.current.phase).toBe("focus");
    expect(result.current.secondsLeft).toBe(POMODORO_DURATIONS.focus);
    expect(result.current.running).toBe(true);
    expect(mockedBell).not.toHaveBeenCalled();
  });

  it("ignores skip during a focus phase", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());
    advanceSeconds(30);

    act(() => result.current.skipBreak());
    expect(result.current.phase).toBe("focus");
    expect(result.current.secondsLeft).toBe(POMODORO_DURATIONS.focus - 30);
  });

  it("pauses and resumes without losing the remaining time", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());
    advanceSeconds(10);

    act(() => result.current.toggle());
    expect(result.current.running).toBe(false);
    advanceSeconds(30);
    expect(result.current.secondsLeft).toBe(POMODORO_DURATIONS.focus - 10);

    act(() => result.current.toggle());
    expect(result.current.running).toBe(true);
    advanceSeconds(5);
    expect(result.current.secondsLeft).toBe(POMODORO_DURATIONS.focus - 15);
  });
});
