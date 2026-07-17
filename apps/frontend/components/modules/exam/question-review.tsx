import type { ExamQuestionResult } from "@/types/exam";
import { Accordion } from "@/components/ui/accordion";
import { EXAM_TEXT } from "./exam.constants";

export function QuestionReview({
  question,
  number,
}: {
  question: ExamQuestionResult;
  number: number;
}) {
  const correct = question.verdict === "correct";

  return (
    <Accordion
      summary={
        <>
          <VerdictIcon correct={correct} />
          <span>
            Pregunta {number}: {question.concept_label}
          </span>
        </>
      }
    >
      <div
        className={`mx-7 mb-6 rounded-md px-8 py-6 ${
          correct ? "bg-primary/15" : "bg-red-100"
        }`}
      >
        <p
          className={`mb-2 text-base font-semibold ${
            correct ? "text-primary" : "text-red-500"
          }`}
        >
          {correct ? EXAM_TEXT.correct : EXAM_TEXT.incorrect}
        </p>
        <p className="text-base leading-snug text-brand-label">
          {question.feedback}
        </p>
      </div>
    </Accordion>
  );
}

function VerdictIcon({ correct }: { correct: boolean }) {
  return (
    <span
      aria-label={correct ? "Correcto" : "Incorrecto"}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
        correct ? "bg-emerald-400" : "bg-red-400"
      }`}
    >
      {correct ? "✓" : "×"}
    </span>
  );
}
