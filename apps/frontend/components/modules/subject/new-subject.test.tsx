import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NewSubjectPage } from "./new-subject-page";
import {
  createSubjectWithModules,
  parseProgram,
  type ProgramParseResult,
} from "@/lib/api/subjects";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("@/lib/api/subjects", () => {
  const actual = jest.requireActual("@/lib/api/subjects");
  return {
    ...actual,
    parseProgram: jest.fn(),
    createSubjectWithModules: jest.fn(),
  };
});

const mockedParse = jest.mocked(parseProgram);
const mockedCreate = jest.mocked(createSubjectWithModules);

const courses = [
  { id: "course-1", name: "Curso A", description: null },
  { id: "course-2", name: "Curso B", description: null },
];

const parseResult: ProgramParseResult = {
  modules: [
    {
      name: "Módulo A",
      topics: [
        { title: "Tema 1", description: "desc 1" },
        { title: "Tema 2", description: "" },
      ],
    },
    { name: "Módulo B", topics: [{ title: "Tema 3", description: "desc 3" }] },
  ],
  coverage: { total_lines: 10, assigned_lines: 9, percentage: 90 },
  orphan_lines: [{ line: 5, text: "línea huérfana" }],
};

const pdf = (name = "programa.pdf", size = 1000) => {
  const file = new File(["x"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

function uploadFile(file: File) {
  const input = screen.getByLabelText("Programa de asignatura");
  fireEvent.change(input, { target: { files: [file] } });
}

function selectCourse(label: string) {
  fireEvent.click(screen.getByRole("button", { name: /seleccionar curso/i }));
  fireEvent.mouseDown(screen.getByText(label));
}

// Leva o fluxo até a tela de preview (somente leitura) com o parseResult padrão
async function enterPreview() {
  mockedParse.mockResolvedValue({
    data: parseResult,
    message: "",
    statusCode: 201,
  });
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Matemáticas" },
  });
  selectCourse("Curso A");
  uploadFile(pdf());
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByRole("button", { name: "Registrar asignatura" });
}

// Preview → "Editar" → tela de review editável
async function enterReview() {
  await enterPreview();
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  await screen.findByDisplayValue("Módulo A");
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("NewSubjectPage — upload validation (client-side)", () => {
  it("rejects a file over 1MB without calling the API", () => {
    render(<NewSubjectPage courses={courses} />);
    uploadFile(pdf("big.pdf", 1_048_577));

    expect(screen.getByRole("alert")).toHaveTextContent(/1MB/i);
    expect(mockedParse).not.toHaveBeenCalled();
  });

  it("rejects an unsupported file type without calling the API", () => {
    render(<NewSubjectPage courses={courses} />);
    const txt = new File(["x"], "notes.txt", { type: "text/plain" });
    uploadFile(txt);

    expect(screen.getByRole("alert")).toHaveTextContent(/PDF o DOCX/i);
    expect(mockedParse).not.toHaveBeenCalled();
  });
});

describe("NewSubjectPage — parse errors", () => {
  it("renders an error on 422 without crashing (stays on form)", async () => {
    mockedParse.mockResolvedValue({
      data: null,
      message: "No pudimos estructurar el documento",
      statusCode: 422,
    });
    render(<NewSubjectPage courses={courses} />);

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Historia" },
    });
    selectCourse("Curso A");
    uploadFile(pdf());
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(
      await screen.findByText(/no pudimos estructurar/i),
    ).toBeInTheDocument();
    // Continua no form (a zona de upload segue visível)
    expect(screen.getByLabelText("Programa de asignatura")).toBeInTheDocument();
  });
});

describe("NewSubjectPage — preview (após o parse)", () => {
  it("shows the parsed structure read-only, without edit controls", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterPreview();

    // Nome da asignatura no topo do card
    expect(screen.getByText("Matemáticas")).toBeInTheDocument();
    // Módulos aparecem como texto, não como input
    expect(screen.getByText("Módulo A")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Módulo A")).not.toBeInTheDocument();
    // Nenhum controle de edição
    expect(
      screen.queryByRole("button", { name: "+ Añadir módulo" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Eliminar módulo/i }),
    ).not.toBeInTheDocument();
  });

  it("expands a module to show its topics (read-only)", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterPreview();

    expect(screen.queryByText("Tema 1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Módulo A/ }));

    expect(screen.getByText("Tema 1")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Tema 1")).not.toBeInTheDocument();
  });

  it("switches to the editable review when Editar is clicked", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterPreview();

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(await screen.findByDisplayValue("Módulo A")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("registers directly from the preview, without entering edit mode", async () => {
    mockedCreate.mockResolvedValue({
      data: { id: "subj-1", name: "Matemáticas" },
      message: "",
      statusCode: 201,
    });
    render(<NewSubjectPage courses={courses} />);
    await enterPreview();

    fireEvent.click(
      screen.getByRole("button", { name: "Registrar asignatura" }),
    );

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const payload = mockedCreate.mock.calls[0][0];
    expect(payload.modules.map((m) => m.name)).toEqual([
      "Módulo A",
      "Módulo B",
    ]);
  });

  it("keeps the preview on screen when POST /subjects fails", async () => {
    mockedCreate.mockResolvedValue({
      data: null,
      message: "Error del servidor",
      statusCode: 500,
    });
    render(<NewSubjectPage courses={courses} />);
    await enterPreview();

    fireEvent.click(
      screen.getByRole("button", { name: "Registrar asignatura" }),
    );

    expect(await screen.findByText("Error del servidor")).toBeInTheDocument();
    expect(screen.getByText("Módulo A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });
});

describe("NewSubjectPage — review editing", () => {
  it("adds a topic to the correct module", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterReview();

    // Módulo A aberto por padrão: 2 temas
    expect(screen.getByDisplayValue("Tema 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ Añadir temario" }));

    const titles = screen.getAllByLabelText(/Título del tema/i);
    expect(titles).toHaveLength(3);
  });

  it("removes the correct topic (by key, not index)", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterReview();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar tema 1" }));

    expect(screen.queryByDisplayValue("Tema 1")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Tema 2")).toBeInTheDocument();
  });

  it("adds and removes a module", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterReview();

    fireEvent.click(screen.getByRole("button", { name: "+ Añadir módulo" }));
    expect(
      screen.getAllByRole("button", { name: /Eliminar módulo/i }),
    ).toHaveLength(3);

    fireEvent.click(
      screen.getAllByRole("button", { name: /Eliminar módulo/i })[2],
    );
    expect(
      screen.getAllByRole("button", { name: /Eliminar módulo/i }),
    ).toHaveLength(2);
  });

  it("disables Registrar when a module has no topics", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterReview();

    // Módulo A tem 2 temas — remove os dois
    fireEvent.click(screen.getByRole("button", { name: "Eliminar tema 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar tema 1" }));

    expect(
      screen.getByRole("button", { name: "Registrar asignatura" }),
    ).toBeDisabled();
  });

  it("disables Registrar when a topic title is empty", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterReview();

    fireEvent.change(screen.getByDisplayValue("Tema 1"), {
      target: { value: "" },
    });
    expect(
      screen.getByRole("button", { name: "Registrar asignatura" }),
    ).toBeDisabled();
  });

  it("does NOT disable Registrar when a description is empty", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterReview();

    // Tema 2 tem description "" mas título válido → habilitado
    expect(
      screen.getByRole("button", { name: "Registrar asignatura" }),
    ).toBeEnabled();
  });

  it("shows the 'sin contenido' badge for empty descriptions", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterReview();

    expect(screen.getByText("sin contenido")).toBeInTheDocument();
  });

  it("keeps orphan lines collapsed by default and expands on click", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterReview();

    expect(screen.queryByText("línea huérfana")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/no fue asignada|no fueron asignadas/i));
    expect(screen.getByText("línea huérfana")).toBeInTheDocument();
  });
});

describe("NewSubjectPage — navegação entre fases", () => {
  it("goes back from review to the read-only preview", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterReview();

    fireEvent.click(screen.getByRole("button", { name: "Volver" }));

    expect(await screen.findByText("Módulo A")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Módulo A")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });

  it("goes back from preview to the form keeping name, course and file", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterPreview();

    fireEvent.click(screen.getByRole("button", { name: "Volver" }));

    expect(await screen.findByLabelText("Nombre")).toHaveValue("Matemáticas");
    expect(screen.getByText("Curso A")).toBeInTheDocument();
    expect(screen.getByText("programa.pdf")).toBeInTheDocument();
  });

  it("does not re-parse when the file has not changed", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterPreview();
    expect(mockedParse).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    fireEvent.click(await screen.findByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("Módulo A")).toBeInTheDocument();
    expect(mockedParse).toHaveBeenCalledTimes(1);
  });

  it("re-parses when a different file is selected", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterPreview();

    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    uploadFile(pdf("otro.pdf"));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() => expect(mockedParse).toHaveBeenCalledTimes(2));
  });

  it("preserves the edits made in review when going back and forth", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterReview();

    fireEvent.change(screen.getByDisplayValue("Módulo A"), {
      target: { value: "Aritmética" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));

    expect(await screen.findByText("Aritmética")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(await screen.findByDisplayValue("Aritmética")).toBeInTheDocument();
  });
});

describe("NewSubjectPage — saída sem registrar", () => {
  it("asks for confirmation before leaving from the preview", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterPreview();

    fireEvent.click(screen.getByRole("link", { name: /home/i }));

    expect(await screen.findByText(/salir sin registrar/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("stays on the page when the user chooses to keep working", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterPreview();

    fireEvent.click(screen.getByRole("link", { name: /home/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Seguir editando" }),
    );

    expect(screen.queryByText(/salir sin registrar/i)).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText("Módulo A")).toBeInTheDocument();
  });

  it("navigates away when the user confirms", async () => {
    render(<NewSubjectPage courses={courses} />);
    await enterPreview();

    fireEvent.click(screen.getByRole("link", { name: /home/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Salir" }));

    expect(push).toHaveBeenCalledWith("/institution/subjects");
  });

  it("does not ask for confirmation while still on the form", () => {
    render(<NewSubjectPage courses={courses} />);

    fireEvent.click(screen.getByRole("link", { name: /home/i }));

    expect(screen.queryByText(/salir sin registrar/i)).not.toBeInTheDocument();
  });
});

describe("NewSubjectPage — persistence", () => {
  it("submits the EDITED structure with no client-side id/key in the body", async () => {
    mockedCreate.mockResolvedValue({
      data: { id: "subj-1", name: "Matemáticas" },
      message: "",
      statusCode: 201,
    });
    render(<NewSubjectPage courses={courses} />);
    await enterReview();

    // Edita o nome do módulo A
    fireEvent.change(screen.getByDisplayValue("Módulo A"), {
      target: { value: "Aritmética" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar asignatura" }),
    );

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const payload = mockedCreate.mock.calls[0][0];
    expect(payload.course_id).toBe("course-1");
    expect(payload.name).toBe("Matemáticas");
    expect(payload.modules[0].name).toBe("Aritmética");
    // Nenhuma key/id client vaza no body
    expect(JSON.stringify(payload)).not.toContain("key");
    expect(JSON.stringify(payload)).not.toContain('"id"');
  });

  it("preserves the review state when POST /subjects fails", async () => {
    mockedCreate.mockResolvedValue({
      data: null,
      message: "Error del servidor",
      statusCode: 500,
    });
    render(<NewSubjectPage courses={courses} />);
    await enterReview();

    fireEvent.click(
      screen.getByRole("button", { name: "Registrar asignatura" }),
    );

    expect(await screen.findByText("Error del servidor")).toBeInTheDocument();
    // O review continua em tela com o trabalho do usuário
    expect(screen.getByDisplayValue("Módulo A")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Tema 1")).toBeInTheDocument();
  });
});
