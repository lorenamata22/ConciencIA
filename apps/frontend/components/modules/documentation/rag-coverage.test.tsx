import { render, screen, waitFor } from "@testing-library/react";
import { RagCoverageModal } from "./rag-coverage-modal";
import { getRagCoverage, type SubjectCoverage } from "@/lib/api/subjects";

jest.mock("@/lib/api/subjects", () => {
  const actual = jest.requireActual("@/lib/api/subjects");
  return { ...actual, getRagCoverage: jest.fn() };
});

const mockedCoverage = jest.mocked(getRagCoverage);

const coverage: SubjectCoverage = {
  subject_id: "subject-1",
  subject_name: "Matemáticas",
  modules: [
    {
      id: "module-1",
      name: "Álgebra",
      topics: [
        {
          id: "topic-a",
          title: "Ecuaciones de primer grado",
          covered: true,
          document_name: "libro.pdf",
        },
        {
          id: "topic-b",
          title: "Inecuaciones",
          covered: false,
          document_name: null,
        },
      ],
    },
  ],
  covered_count: 1,
  total_count: 2,
};

describe("RagCoverageModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCoverage.mockResolvedValue({
      data: coverage,
      message: "",
      statusCode: 200,
    });
  });

  it("should show the covered/total summary once loaded", async () => {
    render(<RagCoverageModal subjectId="subject-1" onClose={jest.fn()} />);

    expect(await screen.findByText(/1 de 2/)).toBeInTheDocument();
  });

  it("should mark a covered topic as indexed and name the document that covers it", async () => {
    render(<RagCoverageModal subjectId="subject-1" onClose={jest.fn()} />);

    const topic = await screen.findByTestId("topic-topic-a");
    expect(topic).toHaveTextContent("Ecuaciones de primer grado");
    expect(topic).toHaveTextContent("libro.pdf");
    expect(
      topic.querySelector('[data-status="covered"]'),
    ).toBeInTheDocument();
  });

  it("should flag an uncovered topic with a warning instead of a check", async () => {
    render(<RagCoverageModal subjectId="subject-1" onClose={jest.fn()} />);

    const topic = await screen.findByTestId("topic-topic-b");
    expect(
      topic.querySelector('[data-status="uncovered"]'),
    ).toBeInTheDocument();
    expect(topic.querySelector('[data-status="covered"]')).toBeNull();
  });

  it("should show an error message when the probe fails", async () => {
    mockedCoverage.mockResolvedValue({
      data: null,
      message: "Límite de tokens de IA alcanzado",
      statusCode: 403,
    });

    render(<RagCoverageModal subjectId="subject-1" onClose={jest.fn()} />);

    expect(
      await screen.findByText("Límite de tokens de IA alcanzado"),
    ).toBeInTheDocument();
  });

  it("should probe only once per open", async () => {
    render(<RagCoverageModal subjectId="subject-1" onClose={jest.fn()} />);

    await screen.findByTestId("topic-topic-a");
    await waitFor(() => expect(mockedCoverage).toHaveBeenCalledTimes(1));
    expect(mockedCoverage).toHaveBeenCalledWith("subject-1");
  });
});
