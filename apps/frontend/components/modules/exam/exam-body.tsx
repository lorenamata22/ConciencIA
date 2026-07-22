"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ExamApiError,
  generateExam,
  getExamOutline,
  submitExamAnswers,
} from "@/lib/api/exams";
import type {
  ExamModuleOutline,
  ExamOptionId,
  ExamResult,
  GeneratedExam,
  StudentExamAnswer,
} from "@/types/exam";
import { TopicSelector } from "./topic-selector";
import { ExamProgress } from "./exam-progress";
import { QuestionCard } from "./question-card";
import { ResultSummary } from "./result-summary";
import { QuestionReview } from "./question-review";
import { ExamActions } from "./exam-actions";
import { EXAM_TEXT } from "./exam.constants";

type ExamStage =
  | "selecting_topic"
  | "generating"
  | "answering"
  | "submitting"
  | "result"
  | "error";

// Corpo do Modo Exame (sem header — o header vive no StudentShell).
// A matéria vem por prop; trocá-la (via header) reinicia o fluxo do exame.
export function ExamBody({
  subjectId,
  subjectName,
  studentName,
}: {
  subjectId: string;
  subjectName: string;
  studentName: string;
}) {
  const [outline, setOutline] = useState<ExamModuleOutline[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(Boolean(subjectId));
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [stage, setStage] = useState<ExamStage>("selecting_topic");
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, StudentExamAnswer>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  // Trocar de matéria reinicia o exame por completo e recarrega o temario
  useEffect(() => {
    if (!subjectId) {
      setOutline([]);
      setOutlineLoading(false);
      return;
    }

    let active = true;
    setOutlineLoading(true);
    setSelectedTopicId("");
    setStage("selecting_topic");
    setExam(null);
    setResult(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setError(null);
    void getExamOutline(subjectId)
      .then((modules) => {
        if (active) setOutline(modules);
      })
      .catch(() => {
        if (active) {
          setOutline([]);
          setError(EXAM_TEXT.genericError);
        }
      })
      .finally(() => {
        if (active) setOutlineLoading(false);
      });

    return () => {
      active = false;
    };
  }, [subjectId]);

  const selectedTopic = useMemo(
    () =>
      outline
        .flatMap((module) => module.topics)
        .find((topic) => topic.id === selectedTopicId),
    [outline, selectedTopicId],
  );
  const currentQuestion = exam?.questions[currentQuestionIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;
  const canAdvance = currentQuestion
    ? currentQuestion.type === "multiple_choice"
      ? Boolean(currentAnswer?.selected_option_id)
      : Boolean(currentAnswer?.essay_text?.trim())
    : false;

  async function startExam(type: "main" | "retry", sourceExamId?: string) {
    if (!selectedTopicId) return;
    setError(null);
    setStage("generating");

    try {
      const generated = await generateExam({
        topic_id: selectedTopicId,
        type,
        ...(sourceExamId ? { source_exam_id: sourceExamId } : {}),
      });
      setExam(generated);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setStage("answering");
    } catch (requestError) {
      if (type === "retry") {
        setError(EXAM_TEXT.retryError);
        setStage("result");
        return;
      }
      setError(
        requestError instanceof ExamApiError && requestError.status === 422
          ? EXAM_TEXT.generationError
          : EXAM_TEXT.genericError,
      );
      setStage("error");
    }
  }

  function updateOption(option: ExamOptionId) {
    if (!currentQuestion) return;
    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: {
        question_id: currentQuestion.id,
        selected_option_id: option,
      },
    }));
  }

  function updateEssay(essayText: string) {
    if (!currentQuestion) return;
    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: {
        question_id: currentQuestion.id,
        essay_text: essayText,
      },
    }));
  }

  async function advanceQuestion() {
    if (!exam || !currentQuestion || !canAdvance) return;
    const lastQuestion = currentQuestionIndex === exam.questions.length - 1;
    if (!lastQuestion) {
      setCurrentQuestionIndex((index) => index + 1);
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setStage("submitting");
    try {
      const submitted = await submitExamAnswers(
        exam.exam_id,
        exam.questions.map((question) => answers[question.id]),
      );
      setResult(submitted);
      setStage("result");
    } catch {
      setError(EXAM_TEXT.submitError);
      setStage("answering");
    } finally {
      submittingRef.current = false;
    }
  }

  function handleViewNotes() {
    // Destino deliberadamente pendente de definição do produto.
  }

  return (
    <main className="mx-auto flex w-full max-w-[712px] flex-1 flex-col pt-14 lg:pt-36">
      <h1 className="mb-16 text-center text-3xl font-medium text-brand-label sm:text-4xl">
        {subjectName}: {EXAM_TEXT.titleSuffix}
      </h1>

      {stage === "selecting_topic" && (
        <div className="flex flex-col items-center">
          {error && <ErrorBanner message={error} />}
          <TopicSelector
            modules={outline}
            selectedTopicId={selectedTopicId}
            loading={outlineLoading}
            onSelect={setSelectedTopicId}
            onConfirm={() => void startExam("main")}
          />
        </div>
      )}

      {(stage === "generating" || stage === "submitting") && (
        <LoadingState stage={stage} />
      )}

      {stage === "error" && error && (
        <div className="flex flex-col items-center">
          <ErrorBanner message={error} />
          <button
            type="button"
            onClick={() => setStage("selecting_topic")}
            className="mt-6 rounded-xl bg-primary px-7 py-3 font-semibold text-primary-text"
          >
            {EXAM_TEXT.tryAgain}
          </button>
        </div>
      )}

      {stage === "answering" && exam && currentQuestion && (
        <div>
          <p className="mb-10 text-base leading-snug text-brand-label">
            {EXAM_TEXT.introduction(studentName)}
          </p>
          <ExamProgress
            current={currentQuestionIndex + 1}
            total={exam.questions.length}
          />
          <div className="mt-12">
            <QuestionCard
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              selectedOption={currentAnswer?.selected_option_id}
              essayText={currentAnswer?.essay_text ?? ""}
              onOptionChange={updateOption}
              onEssayChange={updateEssay}
            />
          </div>
          {error && (
            <div className="mt-5">
              <ErrorBanner message={error} />
            </div>
          )}
          <div className="mt-7 flex justify-end">
            <button
              type="button"
              onClick={() => void advanceQuestion()}
              disabled={!canAdvance || submittingRef.current}
              className="min-w-[298px] rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-text transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {EXAM_TEXT.submitAnswer}
            </button>
          </div>
        </div>
      )}

      {stage === "result" && result && (
        <div className="pb-10">
          <ResultSummary
            result={result}
            concept={selectedTopic?.title ?? subjectName}
          />
          <h2 className="mb-8 mt-12 text-base font-medium text-brand-label">
            {EXAM_TEXT.reviewTitle}
          </h2>
          <div className="flex flex-col gap-2">
            {result.questions.map((question, index) => (
              <QuestionReview
                key={question.id}
                question={question}
                number={index + 1}
              />
            ))}
          </div>
          {error && (
            <div className="mt-5">
              <ErrorBanner message={error} />
            </div>
          )}
          <div className="mt-20">
            <ExamActions
              hasErrors={result.final_score < result.total_questions}
              loading={false}
              onRetry={() => void startExam("retry", result.exam_id)}
              onViewNotes={handleViewNotes}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function LoadingState({ stage }: { stage: "generating" | "submitting" }) {
  const generating = stage === "generating";
  return (
    <div className="flex flex-col items-center pt-12 text-center">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary" />
      <p className="mt-6 text-xl font-medium text-brand-label">
        {generating ? EXAM_TEXT.preparing : EXAM_TEXT.submitting}
      </p>
      <p className="mt-2 max-w-md text-base leading-relaxed text-brand-placeholder">
        {generating ? EXAM_TEXT.preparingDetail : EXAM_TEXT.submittingDetail}
      </p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="w-full rounded-xl bg-red-50 px-5 py-4 text-sm text-red-600"
    >
      {message}
    </p>
  );
}
