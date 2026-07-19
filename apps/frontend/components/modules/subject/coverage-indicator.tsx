"use client";

import type { ProgramCoverage } from "@/lib/api/subjects";
import { COVERAGE_WARN_THRESHOLD } from "./subject.constants";

// Indicador informativo (advisory) — nunca bloqueia o registro.
export function CoverageIndicator({ coverage }: { coverage: ProgramCoverage }) {
  const low = coverage.percentage < COVERAGE_WARN_THRESHOLD;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        low
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : "border-brand-border bg-brand-border/20 text-brand-label"
      }`}
    >
      <p className="font-medium">
        {coverage.percentage}% del documento fue mapeado
      </p>
      <p className="mt-0.5 text-xs">
        {coverage.assigned_lines} de {coverage.total_lines} líneas asignadas a
        un tema
        {low && " · revisa las líneas sin asignar más abajo"}
      </p>
    </div>
  );
}
