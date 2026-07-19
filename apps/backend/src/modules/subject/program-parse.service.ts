import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { parseOffice } from 'officeparser';
import { z } from 'zod';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { AIResponseTruncatedError } from '../ai-provider/ai-provider.interface';
import { AIUsageService } from '../ai-usage/ai-usage.service';
import {
  PROGRAM_ACCEPTED_MIME_TYPES,
  PROGRAM_MAX_FILE_SIZE_BYTES,
  PROGRAM_PARSE_MAX_TOKENS,
} from './program.constants';
import {
  ProgramParsePointers,
  ProgramParseResult,
  programParseSchema,
} from './schemas/program-parse.schema';
import {
  buildProgramParseSystemPrompt,
  buildProgramParseUserContent,
} from './prompts/program-parse.prompt';

// JSON Schema enviado ao provider vem do schema base (structured output)
const programParseJsonSchema = z.toJSONSchema(programParseSchema) as Record<
  string,
  unknown
>;

interface ParseContext {
  userId: string;
  institutionId: string;
}

@Injectable()
export class ProgramParseService {
  constructor(
    private readonly aiProviderService: AIProviderService,
    private readonly aiUsageService: AIUsageService,
  ) {}

  // POST /subjects/program/parse — parse síncrono; NADA é persistido (§14).
  async parse(
    file: Express.Multer.File,
    context: ParseContext,
  ): Promise<ProgramParseResult> {
    this.assertValidFile(file);

    const text = await this.extractText(file);
    const lines = text.split('\n');
    const totalLines = lines.length;
    const numberedText = lines
      .map((line, index) => `${index + 1}: ${line}`)
      .join('\n');

    await this.assertTokenBudget(context);

    const pointers = await this.callParseWithRetry(numberedText, totalLines, context);

    return this.buildResult(pointers, lines);
  }

  // ─── Validação de arquivo (defensiva; o controller também filtra) ─────────

  private assertValidFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Archivo requerido (PDF o DOCX, máximo 1MB)',
      );
    }
    if (!PROGRAM_ACCEPTED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de archivo no soportado. Usa PDF o DOCX.',
      );
    }
    if (file.size > PROGRAM_MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('El archivo supera el límite de 1MB.');
    }
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    const ast = await parseOffice(file.buffer, { ocr: false });
    return ast.toText() ?? '';
  }

  private async assertTokenBudget(context: ParseContext) {
    const canProceed = await this.aiUsageService.hasAvailableTokens(
      context.userId,
      context.institutionId,
    );
    if (!canProceed) {
      throw new ForbiddenException('Límite de tokens de IA alcanzado');
    }
  }

  // ─── Chamada estruturada com 1 retry → depois 422 ─────────────────────────
  // Toda chamada que retorna da API é registrada em AI_Usage (§11), inclusive
  // as que produzem estrutura inválida (tokens foram consumidos).
  private async callParseWithRetry(
    numberedText: string,
    totalLines: number,
    context: ParseContext,
  ): Promise<ProgramParsePointers> {
    const MAX_ATTEMPTS = 2;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // Segunda tentativa é nova chamada à IA — passa de novo pelo gate (§11)
      if (attempt > 1) {
        await this.assertTokenBudget(context);
      }

      let data: unknown;
      try {
        const result = await this.aiProviderService.completeStructured({
          system: buildProgramParseSystemPrompt(),
          messages: [
            { role: 'user', content: buildProgramParseUserContent(numberedText) },
          ],
          maxTokens: PROGRAM_PARSE_MAX_TOKENS,
          jsonSchema: programParseJsonSchema,
        });
        await this.registerUsage(
          context,
          result.promptTokens,
          result.responseTokens,
        );
        data = result.data;
      } catch (error) {
        // Truncamento por max_tokens quebra o JSON — conta como tentativa
        if (error instanceof AIResponseTruncatedError) {
          await this.registerUsage(
            context,
            error.promptTokens,
            error.responseTokens,
          );
          continue;
        }
        throw error;
      }

      const validated = this.validatePointers(data, totalLines);
      if (validated) return validated;
    }

    throw new UnprocessableEntityException(
      'No se pudo estructurar el programa de asignatura',
    );
  }

  private async registerUsage(
    context: ParseContext,
    promptTokens: number,
    responseTokens: number,
  ) {
    const provider = this.aiProviderService.getProvider();
    await this.aiUsageService.register({
      institution_id: context.institutionId,
      user_id: context.userId,
      provider: provider.getProviderName(),
      model: provider.getModelName?.() ?? provider.getProviderName(),
      prompt_tokens: promptTokens,
      response_tokens: responseTokens,
      cost: 0,
    });
  }

  // ─── Validação de ranges em código (§5) ───────────────────────────────────
  // structured output garante números inteiros; não garante que fazem sentido.
  // Bloqueiam (→ retry → 422): start<=end, 1<=start, end<=total, title_line nos
  // limites, ranges de conteúdo sem sobreposição global.
  private validatePointers(
    data: unknown,
    totalLines: number,
  ): ProgramParsePointers | null {
    const parsed = programParseSchema.safeParse(data);
    if (!parsed.success) return null;

    const inBounds = (line: number) => line >= 1 && line <= totalLines;
    const contentRanges: Array<{ start: number; end: number }> = [];

    for (const module of parsed.data.modules) {
      if (!inBounds(module.title_line)) return null;

      for (const topic of module.topics) {
        if (!inBounds(topic.title_line)) return null;

        const { content_start_line: start, content_end_line: end } = topic;
        // Ambos null = tópico só com título (normal). XOR null = inválido.
        if (start == null && end == null) continue;
        if (start == null || end == null) return null;

        if (start > end) return null;
        if (!inBounds(start) || !inBounds(end)) return null;

        contentRanges.push({ start, end });
      }
    }

    // Sobreposição global: ordena por start e verifica encavalamento
    contentRanges.sort((a, b) => a.start - b.start);
    for (let i = 1; i < contentRanges.length; i++) {
      if (contentRanges[i].start <= contentRanges[i - 1].end) return null;
    }

    return parsed.data;
  }

  // ─── Fatiamento + cobertura ───────────────────────────────────────────────
  private buildResult(
    pointers: ProgramParsePointers,
    lines: string[],
  ): ProgramParseResult {
    const assigned = new Set<number>();

    const modules = pointers.modules.map((module) => {
      assigned.add(module.title_line);

      const topics = module.topics.map((topic) => {
        assigned.add(topic.title_line);

        const { content_start_line: start, content_end_line: end } = topic;
        let description = '';
        if (start != null && end != null) {
          // Fatiamento verbatim: linhas [start..end] (1-based, inclusive)
          description = lines.slice(start - 1, end).join('\n');
          for (let line = start; line <= end; line++) assigned.add(line);
        }

        return { title: topic.title, description };
      });

      return { name: module.name, topics };
    });

    // Cobertura calculada sobre linhas NÃO-VAZIAS (§5) — advisory, não bloqueia
    const nonEmptyLines = lines
      .map((text, index) => ({ line: index + 1, text }))
      .filter((entry) => entry.text.trim() !== '');

    const assignedNonEmpty = nonEmptyLines.filter((entry) =>
      assigned.has(entry.line),
    );
    const orphanLines = nonEmptyLines
      .filter((entry) => !assigned.has(entry.line))
      .map((entry) => ({ line: entry.line, text: entry.text }));

    const totalLines = nonEmptyLines.length;
    const assignedLines = assignedNonEmpty.length;
    const percentage =
      totalLines === 0 ? 0 : Math.round((assignedLines / totalLines) * 100);

    return {
      modules,
      coverage: {
        total_lines: totalLines,
        assigned_lines: assignedLines,
        percentage,
      },
      orphan_lines: orphanLines,
    };
  }
}
