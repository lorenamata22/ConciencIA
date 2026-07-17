import type { ExamOptionId, ExamQuestion } from "@/types/exam";
import { EssayInput } from "./essay-input";
import { OptionButton } from "./option-button";
import { EXAM_TEXT } from "./exam.constants";

export function QuestionCard({
  question,
  questionNumber,
  selectedOption,
  essayText,
  onOptionChange,
  onEssayChange,
}: {
  question: ExamQuestion;
  questionNumber: number;
  selectedOption?: ExamOptionId;
  essayText: string;
  onOptionChange: (option: ExamOptionId) => void;
  onEssayChange: (value: string) => void;
}) {
  return (
    <section>
      <p className="mb-7 text-base font-medium text-primary">
        {EXAM_TEXT.question} {questionNumber}
      </p>
      <h2 className="mb-4 text-base font-semibold leading-snug text-brand-label">
        {question.statement}
      </h2>

      {question.type === "multiple_choice" ? (
        <div className="flex flex-col gap-2">
          {question.options.map((option) => (
            <OptionButton
              key={option.id}
              id={option.id}
              text={option.text}
              selected={selectedOption === option.id}
              onSelect={onOptionChange}
            />
          ))}
        </div>
      ) : (
        <div>
          <p className="mb-4 text-base leading-snug text-brand-label">
            {question.hint}
          </p>
          <EssayInput value={essayText} onChange={onEssayChange} />
        </div>
      )}
    </section>
  );
}
