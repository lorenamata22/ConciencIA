import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamPage } from "./exam-page";
import { EssayInput } from "./essay-input";
import { ExamActions } from "./exam-actions";
import { OptionButton } from "./option-button";
import { QuestionReview } from "./question-review";
import {
  ExamApiError,
  generateExam,
  getExamOutline,
  submitExamAnswers,
} from "@/lib/api/exams";
import type {
  ExamModuleOutline,
  ExamResult,
  GeneratedExam,
} from "@/types/exam";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/api/exams", () => {
  const actual = jest.requireActual("@/lib/api/exams");
  return {
    ...actual,
    getExamOutline: jest.fn(),
    generateExam: jest.fn(),
    submitExamAnswers: jest.fn(),
    getExamResult: jest.fn(),
  };
});

const mockedGetOutline = jest.mocked(getExamOutline);
const mockedGenerateExam = jest.mocked(generateExam);
const mockedSubmitAnswers = jest.mocked(submitExamAnswers);

const subjects = [
  { id: "subject-1", name: "Matemáticas", course: { id: "c1", name: "Curso" } },
];

const outline: ExamModuleOutline[] = [
  {
    id: "module-1",
    name: "Módulo de cálculo",
    topics: [
      {
        id: "topic-1",
        title: "Derivadas e integrales",
        description: null,
        order: 1,
      },
    ],
  },
];

const generatedExam: GeneratedExam = {
  exam_id: "exam-1",
  questions: [
    ...["q1", "q2", "q3"].map((id, index) => ({
      id,
      type: "multiple_choice" as const,
      concept_label: `Concepto ${index + 1}`,
      statement: `Enunciado ${id}`,
      options: [
        { id: "a" as const, text: `Opción A ${id}` },
        { id: "b" as const, text: `Opción B ${id}` },
        { id: "c" as const, text: `Opción C ${id}` },
        { id: "d" as const, text: `Opción D ${id}` },
      ],
    })),
    {
      id: "q4",
      type: "essay" as const,
      concept_label: "Integral definida",
      statement: "Explica la integral definida",
      hint: "Puedes mencionar sumas de Riemann.",
    },
    {
      id: "q5",
      type: "essay" as const,
      concept_label: "Teorema fundamental",
      statement: "Explica el teorema fundamental",
      hint: "Puedes mencionar derivadas e integrales.",
    },
  ],
};

const baseResult: ExamResult = {
  exam_id: "exam-1",
  final_score: 3,
  total_questions: 5,
  result_summary: "Buen trabajo, Lorena",
  completed_at: "2026-04-18T12:00:00.000Z",
  execution_time: 1320,
  questions: generatedExam.questions.map((question, index) => ({
    id: question.id,
    concept_label: question.concept_label,
    verdict: index < 3 ? "correct" : "incorrect",
    feedback: `Feedback ${question.id}`,
  })),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetOutline.mockResolvedValue(outline);
  mockedGenerateExam.mockResolvedValue(generatedExam);
  mockedSubmitAnswers.mockResolvedValue(baseResult);
});

describe("Exam controls", () => {
  it("disables answer submission until an option is selected and applies selected state", async () => {
    const user = userEvent.setup();
    renderExamPage();
    await selectTopicAndGenerate(user);

    const submit = screen.getByRole("button", { name: "Enviar respuesta" });
    expect(submit).toBeDisabled();

    const option = screen.getByRole("button", { name: /Opción A q1/i });
    await user.click(option);
    expect(option).toHaveAttribute("aria-pressed", "true");
    expect(option).toHaveAttribute("data-selected", "true");
    expect(submit).toBeEnabled();
  });

  it("disables submission for an empty essay and caps its counter at 600", () => {
    const onChange = jest.fn();
    const { rerender } = render(<EssayInput value="" onChange={onChange} />);
    const textarea = screen.getByPlaceholderText(
      "Escribe tu explicación aquí...",
    );

    fireEvent.change(textarea, { target: { value: "x".repeat(650) } });
    expect(onChange).toHaveBeenCalledWith("x".repeat(600));

    rerender(<EssayInput value={"x".repeat(600)} onChange={onChange} />);
    expect(screen.getByText("600/600")).toBeInTheDocument();
    expect(textarea).toHaveAttribute("maxLength", "600");
  });

  it("increments visible progress when advancing", async () => {
    const user = userEvent.setup();
    renderExamPage();
    await selectTopicAndGenerate(user);
    expect(screen.getByText("Pregunta 1 de 5")).toBeInTheDocument();

    await answerCurrentMc(user, "q1");
    expect(screen.getByText("Pregunta 2 de 5")).toBeInTheDocument();
  });

  it("keeps answer submission disabled while an essay is empty", async () => {
    const user = userEvent.setup();
    renderExamPage();
    await selectTopicAndGenerate(user);
    await answerCurrentMc(user, "q1");
    await answerCurrentMc(user, "q2");
    await answerCurrentMc(user, "q3");

    const submit = screen.getByRole("button", { name: "Enviar respuesta" });
    expect(submit).toBeDisabled();
    await user.type(
      screen.getByPlaceholderText("Escribe tu explicación aquí..."),
      "Respuesta válida",
    );
    expect(submit).toBeEnabled();
  });
});

describe("Exam submission", () => {
  it("submits all five answers once on the last question and blocks a double click", async () => {
    const user = userEvent.setup();
    let resolveSubmission: (result: ExamResult) => void = () => undefined;
    mockedSubmitAnswers.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmission = resolve;
        }),
    );
    renderExamPage();
    await selectTopicAndGenerate(user);
    await reachLastQuestion(user);

    await user.type(
      screen.getByPlaceholderText("Escribe tu explicación aquí..."),
      "Respuesta cinco",
    );
    await user.dblClick(
      screen.getByRole("button", { name: "Enviar respuesta" }),
    );

    expect(mockedSubmitAnswers).toHaveBeenCalledTimes(1);
    expect(mockedSubmitAnswers).toHaveBeenCalledWith("exam-1", [
      { question_id: "q1", selected_option_id: "a" },
      { question_id: "q2", selected_option_id: "a" },
      { question_id: "q3", selected_option_id: "a" },
      { question_id: "q4", essay_text: "Respuesta cuatro" },
      { question_id: "q5", essay_text: "Respuesta cinco" },
    ]);
    resolveSubmission(baseResult);
    expect(await screen.findByText("Buen trabajo, Lorena")).toBeInTheDocument();
  });

  it("keeps the current answer visible when submit fails", async () => {
    const user = userEvent.setup();
    mockedSubmitAnswers.mockRejectedValue(new Error("offline"));
    renderExamPage();
    await selectTopicAndGenerate(user);
    await reachLastQuestion(user);

    const textarea = screen.getByPlaceholderText(
      "Escribe tu explicación aquí...",
    );
    await user.type(textarea, "Mi respuesta preservada");
    await user.click(screen.getByRole("button", { name: "Enviar respuesta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "siguen guardadas en esta pantalla",
    );
    expect(
      screen.getByDisplayValue("Mi respuesta preservada"),
    ).toBeInTheDocument();
  });

  it("renders a friendly message for a 422 generation response", async () => {
    const user = userEvent.setup();
    mockedGenerateExam.mockRejectedValue(new ExamApiError("No context", 422));
    renderExamPage();
    await chooseTopic(user);
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "todavía no tiene material suficiente",
    );
  });

  it("starts a retry with the source exam id", async () => {
    const user = userEvent.setup();
    const retryExam = {
      exam_id: "retry-1",
      questions: [generatedExam.questions[0]],
    };
    mockedGenerateExam
      .mockResolvedValueOnce(generatedExam)
      .mockResolvedValueOnce(retryExam);
    renderExamPage();
    await selectTopicAndGenerate(user);
    await completeExam(user);

    await user.click(
      screen.getByRole("button", { name: /Practicar puntos débiles/i }),
    );
    await waitFor(() =>
      expect(mockedGenerateExam).toHaveBeenNthCalledWith(2, {
        topic_id: "topic-1",
        type: "retry",
        source_exam_id: "exam-1",
      }),
    );
  });
});

describe("Exam result", () => {
  it("does not render weak-points action for a perfect score", () => {
    render(
      <ExamActions
        hasErrors={false}
        loading={false}
        onRetry={jest.fn()}
        onViewNotes={jest.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Practicar puntos débiles/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps feedback hidden until expanded and shows the correct verdict icon", async () => {
    const user = userEvent.setup();
    render(
      <QuestionReview
        number={1}
        question={{
          id: "q1",
          concept_label: "Derivadas",
          verdict: "correct",
          feedback: "Aplicaste correctamente la regla.",
        }}
      />,
    );

    expect(screen.getByLabelText("Correcto")).toBeInTheDocument();
    expect(
      screen.queryByText("Aplicaste correctamente la regla."),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Pregunta 1/i }));
    expect(
      screen.getByText("Aplicaste correctamente la regla."),
    ).toBeInTheDocument();
  });

  it("renders the incorrect verdict icon", () => {
    render(
      <QuestionReview
        number={2}
        question={{
          id: "q2",
          concept_label: "Integrales",
          verdict: "incorrect",
          feedback: "Revisa el concepto.",
        }}
      />,
    );
    expect(screen.getByLabelText("Incorrecto")).toBeInTheDocument();
  });

  it("renders option selected state independently", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(
      <OptionButton
        id="a"
        text="Opción aislada"
        selected
        onSelect={onSelect}
      />,
    );
    const option = screen.getByRole("button", { name: /Opción aislada/i });
    expect(option).toHaveAttribute("aria-pressed", "true");
    await user.click(option);
    expect(onSelect).toHaveBeenCalledWith("a");
  });
});

function renderExamPage() {
  return render(
    <ExamPage
      subjects={subjects}
      initialSubjectId="subject-1"
      studentName="Lorena"
    />,
  );
}

async function chooseTopic(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: "Temario" });
  await user.click(screen.getByRole("button", { name: "Temario" }));
  expect(screen.getByText("Módulo de cálculo")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Módulo de cálculo" }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Derivadas e integrales" }),
  );
}

async function selectTopicAndGenerate(
  user: ReturnType<typeof userEvent.setup>,
) {
  await chooseTopic(user);
  await user.click(screen.getByRole("button", { name: "Confirmar" }));
  await screen.findByText("Pregunta 1 de 5");
}

async function answerCurrentMc(
  user: ReturnType<typeof userEvent.setup>,
  questionId: string,
) {
  await user.click(
    screen.getByRole("button", {
      name: new RegExp(`Opción A ${questionId}`, "i"),
    }),
  );
  await user.click(screen.getByRole("button", { name: "Enviar respuesta" }));
}

async function reachLastQuestion(user: ReturnType<typeof userEvent.setup>) {
  await answerCurrentMc(user, "q1");
  await answerCurrentMc(user, "q2");
  await answerCurrentMc(user, "q3");
  await user.type(
    screen.getByPlaceholderText("Escribe tu explicación aquí..."),
    "Respuesta cuatro",
  );
  await user.click(screen.getByRole("button", { name: "Enviar respuesta" }));
  expect(screen.getByText("Pregunta 5 de 5")).toBeInTheDocument();
}

async function completeExam(user: ReturnType<typeof userEvent.setup>) {
  await reachLastQuestion(user);
  await user.type(
    screen.getByPlaceholderText("Escribe tu explicación aquí..."),
    "Respuesta cinco",
  );
  await user.click(screen.getByRole("button", { name: "Enviar respuesta" }));
  await screen.findByText("Buen trabajo, Lorena");
}
