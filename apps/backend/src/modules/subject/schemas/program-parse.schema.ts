import { z } from 'zod';

// Schema de PONTEIROS do parse do programa de asignatura (CLAUDE.md §14).
// A IA NÃO reproduz o conteúdo: devolve títulos normalizados + números de
// linha, e o backend fatia o texto original. Preserva o texto do professor e
// torna a cobertura computável.
//
// Convenção do repo: schemas do módulo vivem aqui (não em packages/shared,
// que está vazio e desconectado do build) — mesmo padrão do ExamModule.

const topicPointerSchema = z.object({
  title: z.string(),
  title_line: z.number().int(),
  // null = tópico só com título (caso real). Sem null, a IA inventa um range
  // e captura o conteúdo do vizinho.
  content_start_line: z.number().int().nullable(),
  content_end_line: z.number().int().nullable(),
});

const modulePointerSchema = z.object({
  name: z.string(),
  title_line: z.number().int(),
  topics: z.array(topicPointerSchema).min(1),
});

export const programParseSchema = z.object({
  modules: z.array(modulePointerSchema).min(1),
});

export type TopicPointer = z.infer<typeof topicPointerSchema>;
export type ModulePointer = z.infer<typeof modulePointerSchema>;
export type ProgramParsePointers = z.infer<typeof programParseSchema>;

// ─── Payload devolvido pelo endpoint (estrutura já fatiada) ──────────────────
// description = texto fatiado verbatim do original; nada é persistido.

export interface ParsedTopic {
  title: string;
  description: string;
}

export interface ParsedModule {
  name: string;
  topics: ParsedTopic[];
}

export interface ProgramCoverage {
  total_lines: number; // linhas não-vazias (denominador da cobertura)
  assigned_lines: number; // linhas não-vazias atribuídas a título ou conteúdo
  percentage: number; // arredondado
}

export interface OrphanLine {
  line: number;
  text: string;
}

export interface ProgramParseResult {
  modules: ParsedModule[];
  coverage: ProgramCoverage;
  orphan_lines: OrphanLine[];
}
