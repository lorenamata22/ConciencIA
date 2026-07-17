import { z } from 'zod';

// Resposta da chamada 2 (correção em batch): verdict das dissertativas +
// feedback das 5 questões. O verdict das MC é ignorado — sobrescrito em
// código (a IA não decide MC).

export const correctionResponseSchema = z.object({
  results: z.array(
    z.object({
      question_id: z.string(),
      verdict: z.enum(['correct', 'incorrect']).nullable(),
      feedback: z.string(),
    }),
  ),
});

export type CorrectionResponse = z.infer<typeof correctionResponseSchema>;

// A API não garante capitalização de enums de string ("Correct" passa sem
// erro e sem stop_reason especial) — normalizar ANTES do parse do Zod.
export function normalizeCorrectionPayload(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null) return payload;
  const raw = payload as { results?: unknown };
  if (!Array.isArray(raw.results)) return payload;

  return {
    ...raw,
    results: (raw.results as unknown[]).map((item: unknown): unknown => {
      if (typeof item !== 'object' || item === null) return item;
      const entry = item as { verdict?: unknown };
      return {
        ...entry,
        verdict:
          typeof entry.verdict === 'string'
            ? entry.verdict.toLowerCase()
            : (entry.verdict ?? null),
      };
    }),
  };
}
