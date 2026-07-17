import type {
  ApiEnvelope,
  ExamModuleOutline,
  ExamResult,
  ExamType,
  GeneratedExam,
  StudentExamAnswer,
} from "@/types/exam";

export class ExamApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ExamApiError";
  }
}

async function unwrap<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok) {
    throw new ExamApiError(
      payload.message || "Request failed",
      response.status,
    );
  }
  return payload.data;
}

export async function getExamOutline(
  subjectId: string,
): Promise<ExamModuleOutline[]> {
  const response = await fetch(
    `/api/subjects/${encodeURIComponent(subjectId)}/exam-outline`,
    { cache: "no-store" },
  );
  return unwrap<ExamModuleOutline[]>(response);
}

export async function generateExam(input: {
  topic_id: string;
  type: ExamType;
  source_exam_id?: string;
}): Promise<GeneratedExam> {
  const response = await fetch("/api/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return unwrap<GeneratedExam>(response);
}

export async function submitExamAnswers(
  examId: string,
  answers: StudentExamAnswer[],
): Promise<ExamResult> {
  const response = await fetch(
    `/api/exams/${encodeURIComponent(examId)}/answers`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    },
  );
  return unwrap<ExamResult>(response);
}

export async function getExamResult(examId: string): Promise<ExamResult> {
  const response = await fetch(`/api/exams/${encodeURIComponent(examId)}`, {
    cache: "no-store",
  });
  return unwrap<ExamResult>(response);
}
