import type { ExamResult } from "@/types/exam";
import { ScoreRing } from "@/components/ui/score-ring";
import { EXAM_TEXT } from "./exam.constants";

export function ResultSummary({
  result,
  concept,
}: {
  result: ExamResult;
  concept: string;
}) {
  const date = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(result.completed_at));
  const duration = formatDuration(result.execution_time);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <ScoreRing score={result.final_score} total={result.total_questions} />
      <div className="text-center sm:text-left">
        <p className="text-xl font-medium text-brand-label">
          {result.result_summary}
        </p>
        <p className="mt-2 text-base text-brand-label">
          {EXAM_TEXT.completed} {concept} · {date} · {duration}
        </p>
      </div>
    </div>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}
