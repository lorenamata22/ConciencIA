import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StudentLearningScreen } from "@/components/modules/student/student-learning-screen";
import { getExamOutline } from "@/lib/api/exams";
import { getConversation } from "@/lib/api/chat";
import type { ExamModuleOutline } from "@/types/exam";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// react-markdown / remark-gfm são ESM puros — mockados para renderizar texto cru
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("remark-gfm", () => ({ __esModule: true, default: () => {} }));

jest.mock("@/lib/api/exams", () => ({ getExamOutline: jest.fn() }));
jest.mock("@/lib/api/chat", () => ({ getConversation: jest.fn() }));
jest.mock("@/lib/pomodoro/bell", () => ({ playBell: jest.fn() }));

const mockedOutline = jest.mocked(getExamOutline);
const mockedConversation = jest.mocked(getConversation);

const subjects = [
  { id: "s1", name: "Matemáticas", course: { id: "c1", name: "C1" } },
  { id: "s2", name: "Historia", course: { id: "c2", name: "C2" } },
];

const outlineS1: ExamModuleOutline[] = [
  {
    id: "m1",
    name: "Módulo 1",
    topics: [
      { id: "t1", title: "Tema Uno", description: null, order: 1 },
      { id: "t2", title: "Tema Dos", description: null, order: 2 },
    ],
  },
];

const outlineS2: ExamModuleOutline[] = [
  {
    id: "m2",
    name: "Módulo H",
    topics: [{ id: "t3", title: "Tema Tres", description: null, order: 1 }],
  },
];

// jsdom não implementa scrollIntoView (usado no auto-scroll da lista)
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedOutline.mockImplementation((subjectId: string) =>
    Promise.resolve(subjectId === "s1" ? outlineS1 : outlineS2),
  );
  mockedConversation.mockImplementation((subjectId: string, topicId: string) =>
    Promise.resolve({
      conversation: {
        id: `conv-${topicId}`,
        student_id: "st",
        subject_id: subjectId,
        topic_id: topicId,
      },
      messages: [
        {
          id: `msg-${topicId}`,
          role: "assistant" as const,
          content: `Historial de ${topicId}`,
          created_at: "",
        },
      ],
    }),
  );
});

function renderScreen() {
  return render(
    <StudentLearningScreen subjects={subjects} studentName="Lorena" />,
  );
}

async function chooseTopic(title: string) {
  await waitFor(() =>
    expect(screen.getByLabelText("Seleccionar tema")).toBeEnabled(),
  );
  fireEvent.click(screen.getByLabelText("Seleccionar tema"));
  fireEvent.click(screen.getByText(title));
}

function changeSubject(name: string) {
  fireEvent.click(screen.getByRole("button", { name: /matemáticas|historia/i }));
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("Chat — stage de seleção de tópico", () => {
  it("should show the topic stage for the current subject", async () => {
    renderScreen();

    expect(screen.getByText("¿Empezamos con Matemáticas?")).toBeInTheDocument();
    // A matéria vive só no header — não há dropdown de matéria no corpo
    expect(screen.queryByText("Elegir asignatura")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText("Seleccionar tema")).toBeEnabled(),
    );
  });

  it("should keep Confirmar disabled until a topic is selected", async () => {
    renderScreen();

    await waitFor(() =>
      expect(screen.getByLabelText("Seleccionar tema")).toBeEnabled(),
    );
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();

    await chooseTopic("Tema Uno");
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
  });

  it("should open the chat with the selected topic history after confirming", async () => {
    renderScreen();
    await chooseTopic("Tema Uno");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("Historial de t1")).toBeInTheDocument();
    expect(mockedConversation).toHaveBeenCalledWith("s1", "t1");
    expect(
      screen.queryByRole("button", { name: "Confirmar" }),
    ).not.toBeInTheDocument();
  });

  it("should not render a topic select inside the chat", async () => {
    renderScreen();
    await chooseTopic("Tema Uno");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await screen.findByText("Historial de t1");
    expect(screen.queryByLabelText("Seleccionar tema")).not.toBeInTheDocument();
  });

  it("should return to the topic stage from the chat via Cambiar temario", async () => {
    renderScreen();
    await chooseTopic("Tema Uno");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await screen.findByText("Historial de t1");

    fireEvent.click(screen.getByRole("button", { name: /cambiar temario/i }));

    expect(screen.getByText("¿Empezamos con Matemáticas?")).toBeInTheDocument();
    expect(screen.queryByText("Historial de t1")).not.toBeInTheDocument();
  });

  it("should reload the conversation when a different topic is confirmed", async () => {
    renderScreen();
    await chooseTopic("Tema Uno");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await screen.findByText("Historial de t1");

    fireEvent.click(screen.getByRole("button", { name: /cambiar temario/i }));
    await chooseTopic("Tema Dos");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("Historial de t2")).toBeInTheDocument();
    expect(screen.queryByText("Historial de t1")).not.toBeInTheDocument();
    expect(mockedConversation).toHaveBeenCalledWith("s1", "t2");
  });

  it("should return to the topic stage when the subject changes in the header", async () => {
    renderScreen();
    await chooseTopic("Tema Uno");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await screen.findByText("Historial de t1");

    changeSubject("Historia");

    expect(
      await screen.findByText("¿Empezamos con Historia?"),
    ).toBeInTheDocument();
    await waitFor(() => expect(mockedOutline).toHaveBeenCalledWith("s2"));
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });
});
