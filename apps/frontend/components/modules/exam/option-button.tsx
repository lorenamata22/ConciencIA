import type { ExamOptionId } from "@/types/exam";

export function OptionButton({
  id,
  text,
  selected,
  onSelect,
}: {
  id: ExamOptionId;
  text: string;
  selected: boolean;
  onSelect: (id: ExamOptionId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      data-selected={selected ? "true" : "false"}
      className={`flex min-h-[54px] w-full items-center gap-7 rounded-2xl border px-5 py-3 text-left text-base transition-colors ${
        selected
          ? "border-brand-label bg-brand-label text-white"
          : "border-brand-border bg-white text-brand-label hover:border-primary"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold uppercase ${
          selected
            ? "border-white/70 bg-white/15 text-white"
            : "border-brand-border bg-brand-bg text-brand-label"
        }`}
      >
        {id}
      </span>
      <span>{text}</span>
    </button>
  );
}
