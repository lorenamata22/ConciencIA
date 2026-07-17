import { EXAM_TEXT } from "./exam.constants";

export function ExamActions({
  hasErrors,
  loading,
  onRetry,
  onViewNotes,
}: {
  hasErrors: boolean;
  loading: boolean;
  onRetry: () => void;
  onViewNotes: () => void;
}) {
  return (
    <div className="flex flex-col justify-end gap-3 sm:flex-row">
      {hasErrors && (
        <button
          type="button"
          onClick={onRetry}
          disabled={loading}
          className="rounded-lg border border-primary bg-white px-5 py-3 text-base font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          ↻&nbsp; {EXAM_TEXT.retry}
        </button>
      )}
      <button
        type="button"
        onClick={onViewNotes}
        className="rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-text transition-colors hover:bg-primary-hover"
      >
        ▧&nbsp; {EXAM_TEXT.viewNotes}
      </button>
    </div>
  );
}
