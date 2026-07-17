import { EXAM_ESSAY_MAX_LENGTH, EXAM_TEXT } from "./exam.constants";

export function EssayInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <textarea
        value={value}
        maxLength={EXAM_ESSAY_MAX_LENGTH}
        onChange={(event) =>
          onChange(event.target.value.slice(0, EXAM_ESSAY_MAX_LENGTH))
        }
        placeholder={EXAM_TEXT.essayPlaceholder}
        rows={6}
        className="min-h-40 w-full resize-none rounded-xl border border-brand-border bg-white px-4 py-3 text-base text-brand-brown placeholder:text-brand-placeholder focus:border-primary focus:outline-none"
      />
      <p className="mt-2 text-right text-base text-brand-placeholder">
        {value.length}/{EXAM_ESSAY_MAX_LENGTH}
      </p>
    </div>
  );
}
