export function ExamProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <p className="text-base text-brand-label">
      Pregunta {current} de {total}
    </p>
  );
}
