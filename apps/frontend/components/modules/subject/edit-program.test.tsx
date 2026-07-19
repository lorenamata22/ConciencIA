import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SubjectProgramSection } from "./subject-program-section";
import {
  parseProgram,
  syncSubjectStructure,
  type ProgramParseResult,
  type StoredModule,
} from "@/lib/api/subjects";

jest.mock("@/lib/api/subjects", () => {
  const actual = jest.requireActual("@/lib/api/subjects");
  return {
    ...actual,
    parseProgram: jest.fn(),
    syncSubjectStructure: jest.fn(),
  };
});

const mockedParse = jest.mocked(parseProgram);
const mockedSync = jest.mocked(syncSubjectStructure);

const stored: StoredModule[] = [
  {
    id: "module-1",
    name: "Aritmética",
    order: 0,
    topics: [
      { id: "topic-1", title: "Números", description: "contenido 1", order: 0 },
      { id: "topic-2", title: "Divisibilidad", description: null, order: 1 },
    ],
  },
];

const parseResult: ProgramParseResult = {
  modules: [
    {
      name: "Geometría",
      topics: [{ title: "Triángulos", description: "nuevo contenido" }],
    },
  ],
  coverage: { total_lines: 10, assigned_lines: 10, percentage: 100 },
  orphan_lines: [],
};

const pdf = (name = "programa.pdf", size = 1000) => {
  const file = new File(["x"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

function renderSection() {
  return render(
    <SubjectProgramSection
      subjectId="subject-1"
      subjectName="Matemáticas"
      modules={stored}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSync.mockResolvedValue({
    data: { id: "subject-1", name: "Matemáticas", course: { id: "c", name: "C" }, modules: stored },
    message: "",
    statusCode: 200,
  });
});

describe("SubjectProgramSection — visualización", () => {
  it("shows the stored structure read-only", () => {
    renderSection();

    expect(screen.getByText("Aritmética")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Aritmética")).not.toBeInTheDocument();
  });

  it("expands a module to reveal its topics", () => {
    renderSection();

    expect(screen.queryByText("Números")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Aritmética/ }));

    expect(screen.getByText("Números")).toBeInTheDocument();
    expect(screen.getByText("contenido 1")).toBeInTheDocument();
  });
});

describe("SubjectProgramSection — edición manual", () => {
  it("opens the editor modal with the current structure", () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Editar programa" }));

    expect(screen.getByDisplayValue("Aritmética")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Números")).toBeInTheDocument();
  });

  it("saves preserving the persisted ids so student data survives", async () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Editar programa" }));
    fireEvent.change(screen.getByDisplayValue("Números"), {
      target: { value: "Números naturales" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mockedSync).toHaveBeenCalledTimes(1));
    const [subjectId, payload] = mockedSync.mock.calls[0];
    expect(subjectId).toBe("subject-1");
    expect(payload.modules[0].id).toBe("module-1");
    expect(payload.modules[0].topics[0]).toEqual(
      expect.objectContaining({ id: "topic-1", title: "Números naturales" }),
    );
  });

  it("discards the edits when the modal is cancelled", async () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Editar programa" }));
    fireEvent.change(screen.getByDisplayValue("Aritmética"), {
      target: { value: "Cambiado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mockedSync).not.toHaveBeenCalled();
    expect(screen.getByText("Aritmética")).toBeInTheDocument();
    expect(screen.queryByText("Cambiado")).not.toBeInTheDocument();
  });

  it("surfaces the 409 message when a removed topic is in use", async () => {
    mockedSync.mockResolvedValue({
      data: null,
      message: "No se puede eliminar un tema que ya tiene progreso",
      statusCode: 409,
    });
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Editar programa" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar tema 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText(/no se puede eliminar un tema/i),
    ).toBeInTheDocument();
  });
});

// Matéria recém-criada, ainda sem programa: não há nada a substituir, então
// nenhum aviso de replace deve aparecer.
describe("SubjectProgramSection — primer programa (sin estructura)", () => {
  function renderEmpty() {
    return render(
      <SubjectProgramSection
        subjectId="subject-1"
        subjectName="Matemáticas"
        modules={[]}
      />,
    );
  }

  it("shows an empty state instead of an empty card", () => {
    renderEmpty();

    expect(screen.getByText(/todavía no hay programa/i)).toBeInTheDocument();
  });

  it("offers a plain upload CTA, without the 'nuevo' framing", () => {
    renderEmpty();

    expect(
      screen.getByRole("button", { name: "Subir programa" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Subir nuevo programa" }),
    ).not.toBeInTheDocument();
  });

  it("does not offer manual editing when there is nothing to edit", () => {
    renderEmpty();

    expect(
      screen.queryByRole("button", { name: "Editar programa" }),
    ).not.toBeInTheDocument();
  });

  it("goes straight to the upload, skipping the replace warning", () => {
    renderEmpty();

    fireEvent.click(screen.getByRole("button", { name: "Subir programa" }));

    expect(screen.queryByText(/reescribir/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continuar" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Programa de asignatura")).toBeInTheDocument();
  });

  it("does not warn about replacing while reviewing the parsed program", async () => {
    mockedParse.mockResolvedValue({
      data: parseResult,
      message: "",
      statusCode: 201,
    });
    renderEmpty();

    fireEvent.click(screen.getByRole("button", { name: "Subir programa" }));
    fireEvent.change(screen.getByLabelText("Programa de asignatura"), {
      target: { files: [pdf()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("Geometría")).toBeInTheDocument();
    expect(screen.queryByText(/reemplazará/i)).not.toBeInTheDocument();
  });

  it("still saves the parsed structure", async () => {
    mockedParse.mockResolvedValue({
      data: parseResult,
      message: "",
      statusCode: 201,
    });
    renderEmpty();

    fireEvent.click(screen.getByRole("button", { name: "Subir programa" }));
    fireEvent.change(screen.getByLabelText("Programa de asignatura"), {
      target: { files: [pdf()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Guardar programa" }),
    );

    await waitFor(() => expect(mockedSync).toHaveBeenCalledTimes(1));
    expect(mockedSync.mock.calls[0][1].modules[0].name).toBe("Geometría");
  });
});

describe("SubjectProgramSection — nuevo programa", () => {
  it("warns that uploading rewrites the whole program", () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Subir nuevo programa" }));

    expect(screen.getByText(/reescribir/i)).toBeInTheDocument();
  });

  it("keeps the old structure untouched until the new flow is confirmed", async () => {
    mockedParse.mockResolvedValue({
      data: parseResult,
      message: "",
      statusCode: 201,
    });
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Subir nuevo programa" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByLabelText("Programa de asignatura"), {
      target: { files: [pdf()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    // Preview do novo programa já em tela, mas nada foi persistido ainda
    expect(await screen.findByText("Geometría")).toBeInTheDocument();
    expect(mockedSync).not.toHaveBeenCalled();
  });

  it("replaces the structure without ids when the new program is confirmed", async () => {
    mockedParse.mockResolvedValue({
      data: parseResult,
      message: "",
      statusCode: 201,
    });
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Subir nuevo programa" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByLabelText("Programa de asignatura"), {
      target: { files: [pdf()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(await screen.findByRole("button", { name: "Guardar programa" }));

    await waitFor(() => expect(mockedSync).toHaveBeenCalledTimes(1));
    const [, payload] = mockedSync.mock.calls[0];
    expect(payload.modules[0].name).toBe("Geometría");
    // Estrutura nova = sem ids; o backend remove a antiga (e barra se estiver em uso)
    expect(payload.modules[0]).not.toHaveProperty("id");
    expect(payload.modules[0].topics[0]).not.toHaveProperty("id");
  });
});
