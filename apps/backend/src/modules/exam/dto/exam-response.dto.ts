// DTOs de resposta do ExamModule (CLAUDE.md §8/§12): dois shapes distintos e
// obrigatórios — o gabarito (correct_option_id, rationale, key_points,
// source_reference) nunca sai do backend antes do submit.

export interface ExamOptionPublicDto {
  id: string;
  text: string;
}

// Início do exame — SEM gabarito
export interface ExamQuestionPublicDto {
  id: string;
  type: 'multiple_choice' | 'essay';
  concept_label: string;
  statement: string;
  options?: ExamOptionPublicDto[]; // MC: sem correct_option_id
  hint?: string; // dissertativa: sem key_points
}

export interface CreateExamResponseDto {
  exam_id: string;
  questions: ExamQuestionPublicDto[];
}

// Pós-submit / releitura — mínimo, conforme o Figma
// (sem statement nem options: a tela de resultado não os exibe)
export interface ExamQuestionResultDto {
  id: string;
  concept_label: string;
  verdict: 'correct' | 'incorrect' | null;
  feedback: string | null;
}

export interface ExamResultDto {
  exam_id: string;
  final_score: number;
  total_questions: number;
  result_summary: string;
  completed_at: Date;
  execution_time: number;
  questions: ExamQuestionResultDto[];
}
