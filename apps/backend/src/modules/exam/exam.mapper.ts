import { ExamContent, StudentAnswer } from './schemas/exam-content.schema';
import {
  ExamQuestionPublicDto,
  ExamQuestionResultDto,
  ExamResultDto,
} from './dto/exam-response.dto';

// Mappers puros entre o conteúdo persistido e os DTOs de resposta.
// Construção por allowlist (campo a campo) — nunca por spread/delete — para
// que gabarito novo no schema não vaze por acidente (CLAUDE.md §12).

export function toPublicQuestions(
  content: ExamContent,
): ExamQuestionPublicDto[] {
  return content.questions.map((question) => {
    if (question.type === 'multiple_choice') {
      return {
        id: question.id,
        type: question.type,
        concept_label: question.concept_label,
        statement: question.statement,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
        })),
      };
    }
    return {
      id: question.id,
      type: question.type,
      concept_label: question.concept_label,
      statement: question.statement,
      hint: question.hint,
    };
  });
}

export interface PersistedExam {
  id: string;
  final_score: number | null;
  result_summary: string | null;
  completed_at: Date | null;
  execution_time: number | null;
  exam_content_json: unknown;
  student_answers_json: unknown;
}

export function toResultDto(exam: PersistedExam): ExamResultDto {
  const content = exam.exam_content_json as ExamContent;
  const answers =
    (exam.student_answers_json as { answers?: StudentAnswer[] })?.answers ?? [];
  const answersByQuestion = new Map(
    answers.map((answer) => [answer.question_id, answer]),
  );

  const questions: ExamQuestionResultDto[] = content.questions.map(
    (question) => {
      const answer = answersByQuestion.get(question.id);
      return {
        id: question.id,
        concept_label: question.concept_label,
        verdict: answer?.verdict ?? null,
        feedback: answer?.feedback ?? null,
      };
    },
  );

  return {
    exam_id: exam.id,
    final_score: exam.final_score ?? 0,
    total_questions: content.questions.length,
    result_summary: exam.result_summary ?? '',
    completed_at: exam.completed_at ?? new Date(0),
    execution_time: exam.execution_time ?? 0,
    questions,
  };
}
