import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChatScreen } from "./chat-screen";
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

function chooseSubject(label: string) {
  // Abre o ObjectSelect da matéria (mostra o placeholder ou a matéria atual)
  fireEvent.click(screen.getByText(/elegir asignatura|matemáticas|historia/i));
  fireEvent.mouseDown(screen.getByText(label));
}

describe("Chat — cascade matéria → tópico", () => {
  it("keeps the topic selector disabled until a subject is chosen", () => {
    render(<ChatScreen subjects={subjects} />);
    expect(screen.getByLabelText("Seleccionar tema")).toBeDisabled();
  });

  it("does not open the chat until a topic is selected", async () => {
    render(<ChatScreen subjects={subjects} />);
    chooseSubject("Matemáticas");

    // Temario carrega, mas sem tópico o botão "Empezar" segue desabilitado
    await waitFor(() =>
      expect(screen.getByLabelText("Seleccionar tema")).toBeEnabled(),
    );
    expect(screen.getByRole("button", { name: "Empezar" })).toBeDisabled();
    // Continua na tela de seleção
    expect(screen.getByText("¿Qué estudiamos hoy?")).toBeInTheDocument();
  });

  it("clears the topic selection when the subject changes", async () => {
    render(<ChatScreen subjects={subjects} />);
    chooseSubject("Matemáticas");

    await waitFor(() =>
      expect(screen.getByLabelText("Seleccionar tema")).toBeEnabled(),
    );
    fireEvent.click(screen.getByLabelText("Seleccionar tema"));
    fireEvent.click(screen.getByText("Tema Uno"));
    expect(screen.getByRole("button", { name: "Empezar" })).toBeEnabled();

    // Troca a matéria → tópico limpo → "Empezar" volta a desabilitar
    chooseSubject("Historia");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Empezar" })).toBeDisabled(),
    );
  });

  it("loads the history of the selected topic and does not mix topics", async () => {
    render(<ChatScreen subjects={subjects} />);
    chooseSubject("Matemáticas");

    await waitFor(() =>
      expect(screen.getByLabelText("Seleccionar tema")).toBeEnabled(),
    );
    fireEvent.click(screen.getByLabelText("Seleccionar tema"));
    fireEvent.click(screen.getByText("Tema Uno"));
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));

    // Entrou no chat com o histórico do tópico t1
    expect(await screen.findByText("Historial de t1")).toBeInTheDocument();
    expect(mockedConversation).toHaveBeenCalledWith("s1", "t1");

    // Troca de tópico no header → carrega o histórico de t2, sem misturar
    fireEvent.click(screen.getByLabelText("Seleccionar tema"));
    fireEvent.click(screen.getByText("Tema Dos"));

    expect(await screen.findByText("Historial de t2")).toBeInTheDocument();
    expect(screen.queryByText("Historial de t1")).not.toBeInTheDocument();
    expect(mockedConversation).toHaveBeenCalledWith("s1", "t2");
  });
});
