import { act, fireEvent, render, screen } from "@testing-library/react";
import { LearningModeSelector } from "./learning-mode-selector";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("LearningModeSelector", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("animates to exam mode before navigating and preserves the subject", () => {
    render(<LearningModeSelector mode="study" subjectId="math-1" />);
    const toggle = screen.getByRole("switch", { name: "Modo estudios" });

    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);

    expect(screen.getByRole("switch", { name: "Modo Examen" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(mockPush).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(460));
    expect(mockPush).toHaveBeenCalledWith("/student/exam?subjectId=math-1");
  });

  it("animates back to study mode", () => {
    render(<LearningModeSelector mode="exam" />);
    fireEvent.click(screen.getByRole("switch", { name: "Modo Examen" }));

    act(() => jest.advanceTimersByTime(460));
    expect(mockPush).toHaveBeenCalledWith("/student");
  });
});
