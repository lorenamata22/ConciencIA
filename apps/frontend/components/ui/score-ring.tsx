export function ScoreRing({ score, total }: { score: number; total: number }) {
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  const progress = total === 0 ? 0 : score / total;

  return (
    <div className="relative h-[104px] w-[104px] shrink-0">
      <svg
        className="-rotate-90"
        viewBox="0 0 104 104"
        role="img"
        aria-label={`${score} de ${total} respuestas correctas`}
      >
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="#E1E2E2"
          strokeWidth="10"
        />
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="10"
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-brand-label">
        <strong className="text-4xl leading-none">{score}</strong>
        <span className="text-base">de {total}</span>
      </div>
    </div>
  );
}
