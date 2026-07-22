import { fireEvent, render, screen } from "@testing-library/react";
import { StudentShell } from "./student-shell";
import { useStudentLearning } from "./student-context";
import { PomodoroProvider } from "@/components/providers/pomodoro-provider";

const mockPush = jest.fn();
let mockPathname = "/student";
const mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/lib/pomodoro/bell", () => ({ playBell: jest.fn() }));

const subjects = [
  { id: "s1", name: "Matemáticas", course: { id: "c1", name: "C1" } },
  { id: "s2", name: "Historia", course: { id: "c2", name: "C2" } },
];

// Espia o contexto para verificar o que o corpo receberia
function Probe() {
  const { mode, subjectId } = useStudentLearning();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="subject">{subjectId}</span>
    </div>
  );
}

function renderShell() {
  return render(
    <PomodoroProvider>
      <StudentShell subjects={subjects} studentName="Lorena">
        <Probe />
      </StudentShell>
    </PomodoroProvider>,
  );
}

describe("StudentShell", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPathname = "/student";
  });

  it("shows the mode selector, pomodoro and topbar icons on any student route", () => {
    mockPathname = "/student/files";
    renderShell();

    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toBeInTheDocument();
    expect(screen.getByLabelText("Notificaciones")).toBeInTheDocument();
    expect(screen.getByLabelText("Perfil")).toBeInTheDocument();
  });

  it("hides the subject selector outside the learning screen", () => {
    mockPathname = "/student/files";
    renderShell();
    expect(
      screen.queryByRole("button", { name: /matemáticas|historia/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the subject selector on the learning screen", () => {
    mockPathname = "/student";
    renderShell();
    expect(
      screen.getByRole("button", { name: /matemáticas/i }),
    ).toBeInTheDocument();
  });

  it("toggles mode in place on /student without navigating", () => {
    mockPathname = "/student";
    renderShell();

    expect(screen.getByTestId("mode")).toHaveTextContent("study");
    fireEvent.click(screen.getByRole("switch"));

    expect(screen.getByTestId("mode")).toHaveTextContent("exam");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to /student in the chosen mode from another student route", () => {
    mockPathname = "/student/files";
    renderShell();

    fireEvent.click(screen.getByRole("switch"));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/student?mode=exam"),
    );
  });
});
