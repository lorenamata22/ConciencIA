export interface ApiEnvelope<T> {
  data: T;
  message: string;
  statusCode: number;
}

export interface ExamTopic {
  id: string;
  title: string;
  description: string | null;
  order: number;
}

export interface ExamModuleOutline {
  id: string;
  name: string;
  topics: ExamTopic[];
}

export type ExamOptionId = "a" | "b" | "c" | "d";

export interface MultipleChoiceQuestion {
  id: string;
  type: "multiple_choice";
  concept_label: string;
  statement: string;
  options: { id: ExamOptionId; text: string }[];
}

export interface EssayQuestion {
  id: string;
  type: "essay";
  concept_label: string;
  statement: string;
  hint: string;
}

export type ExamQuestion = MultipleChoiceQuestion | EssayQuestion;

export interface GeneratedExam {
  exam_id: string;
  questions: ExamQuestion[];
}

export interface StudentExamAnswer {
  question_id: string;
  selected_option_id?: ExamOptionId;
  essay_text?: string;
}

export interface ExamQuestionResult {
  id: string;
  concept_label: string;
  verdict: "correct" | "incorrect";
  feedback: string;
}

export interface ExamResult {
  exam_id: string;
  final_score: number;
  total_questions: number;
  result_summary: string;
  completed_at: string;
  execution_time: number;
  questions: ExamQuestionResult[];
}

export type ExamType = "main" | "retry";
