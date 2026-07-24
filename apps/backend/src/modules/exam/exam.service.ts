import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExamType, Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { AIResponseTruncatedError } from '../ai-provider/ai-provider.interface';
import { RagService } from '../rag/rag.service';
import { AIUsageService } from '../ai-usage/ai-usage.service';
import { TopicProgressService } from '../topic-progress/topic-progress.service';
import { StudentMetricsService } from '../student-metrics/student-metrics.service';
import { AlertRulesService } from '../alert/alert-rules.service';
import {
  EXAM_BLANK_ESSAY_FEEDBACK,
  EXAM_CORRECTION_MAX_TOKENS,
  EXAM_ESSAY_MAX_CHARS,
  EXAM_GENERATION_MAX_TOKENS,
  EXAM_MAIN_ESSAY_COUNT,
  EXAM_MAIN_MC_COUNT,
  EXAM_MAIN_RAG_CHUNKS,
  EXAM_RETRY_MAX_QUESTIONS,
  EXAM_RETRY_RAG_CHUNKS,
  buildResultSummary,
} from './exam.constants';
import {
  ExamContent,
  StudentAnswer,
  buildExamContentSchema,
  examContentSchema,
} from './schemas/exam-content.schema';
import {
  CorrectionResponse,
  correctionResponseSchema,
  normalizeCorrectionPayload,
} from './schemas/correction-response.schema';
import {
  EXAM_GENERATION_USER_MESSAGE,
  buildExamGenerationSystemPrompt,
} from './prompts/exam-generation.prompt';
import {
  CorrectionEssayItem,
  CorrectionMcItem,
  buildExamCorrectionSystemPrompt,
  buildExamCorrectionUserContent,
} from './prompts/exam-correction.prompt';
import { toPublicQuestions, toResultDto } from './exam.mapper';
import { CreateExamResponseDto, ExamResultDto } from './dto/exam-response.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';

// JSON Schemas enviados ao provider vêm dos schemas base (refinements não
// são representáveis em JSON Schema — rodam na validação da resposta)
const examContentJsonSchema = z.toJSONSchema(examContentSchema) as Record<
  string,
  unknown
>;
const correctionJsonSchema = z.toJSONSchema(correctionResponseSchema) as Record<
  string,
  unknown
>;

@Injectable()
export class ExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProviderService: AIProviderService,
    private readonly ragService: RagService,
    private readonly aiUsageService: AIUsageService,
    private readonly topicProgressService: TopicProgressService,
    private readonly studentMetricsService: StudentMetricsService,
    private readonly alertRulesService: AlertRulesService,
  ) {}

  // ─── Geração (POST /exams) ────────────────────────────────────────────────

  async generate(
    userId: string,
    institutionId: string,
    dto: CreateExamDto,
  ): Promise<CreateExamResponseDto> {
    const student = await this.loadStudent(userId, institutionId);
    const topic = await this.loadTopicInTenant(dto.topic_id, institutionId);
    const subjectId = topic.module.subject_id;

    await this.assertTokenBudget(userId, institutionId);

    // main: prova completa sobre o tópico; retry: questões novas sobre as
    // erradas do exame de origem (n = min(erradas, EXAM_RETRY_MAX_QUESTIONS))
    let mcCount = EXAM_MAIN_MC_COUNT;
    let essayCount = EXAM_MAIN_ESSAY_COUNT;
    let missedStatements: string[] | undefined;
    let ragQuery = `${topic.title} ${topic.description ?? ''}`.trim();

    if (dto.type === 'retry') {
      const missed = await this.loadMissedQuestions(
        dto.source_exam_id,
        student.id,
      );
      const taken = missed.slice(0, EXAM_RETRY_MAX_QUESTIONS);
      mcCount = taken.filter(
        (question) => question.type === 'multiple_choice',
      ).length;
      essayCount = taken.filter((question) => question.type === 'essay').length;
      missedStatements = taken.map((question) => question.statement);
      ragQuery = missedStatements.join(' ');
    }

    const searchResult = await this.ragService.search({
      query: ragQuery,
      institutionId,
      subjectId,
      // Temporariamente, o exame busca contexto em toda a matéria.
      // Reativar quando os materiais estiverem vinculados aos tópicos:
      // topicId: topic.id,
      topK: dto.type === 'retry' ? EXAM_RETRY_RAG_CHUNKS : EXAM_MAIN_RAG_CHUNKS,
    });
    const chunks = (searchResult?.chunks ?? []).map(
      (chunk) => chunk.chunk_text,
    );
    // Sem material do professor não há exame — bloqueia, não faz fallback (§7)
    if (chunks.length === 0 || !searchResult.hasSufficientContext) {
      throw new UnprocessableEntityException(
        'Tema sin material de contexto para generar el examen',
      );
    }

    const system = buildExamGenerationSystemPrompt({
      subjectName: topic.module.subject.name,
      topicTitle: topic.title,
      ragChunks: chunks,
      cognitiveProfile: student.cognitive_profile,
      mcCount,
      essayCount,
      mode: dto.type,
      missedStatements,
    });

    const content = await this.callStructuredWithRetry<ExamContent>(
      {
        system,
        messages: [{ role: 'user', content: EXAM_GENERATION_USER_MESSAGE }],
        maxTokens: EXAM_GENERATION_MAX_TOKENS,
        jsonSchema: examContentJsonSchema,
      },
      (data) => {
        const parsed = buildExamContentSchema(mcCount, essayCount).safeParse(
          data,
        );
        return parsed.success ? parsed.data : null;
      },
      { userId, institutionId },
      'La IA no generó un examen válido',
    );

    const exam = await this.prisma.exam.create({
      data: {
        student_id: student.id,
        subject_id: subjectId,
        topic_id: topic.id,
        exam_type: dto.type === 'retry' ? ExamType.retry : ExamType.main,
        exam_content_json: content as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      exam_id: exam.id,
      questions: toPublicQuestions(content),
    };
  }

  // ─── Correção (POST /exams/:id/answers) ──────────────────────────────────

  async submitAnswers(
    userId: string,
    institutionId: string,
    examId: string,
    dto: SubmitAnswersDto,
  ): Promise<ExamResultDto> {
    const student = await this.loadStudent(userId, institutionId);
    const exam = await this.loadOwnExam(examId, student.id);
    if (exam.completed_at != null) {
      throw new BadRequestException('El examen ya fue completado');
    }

    const content = exam.exam_content_json as unknown as ExamContent;
    const answersByQuestion = this.assertAllQuestionsAnswered(content, dto);

    // Respostas cruas persistidas ANTES da chamada de correção — se a IA
    // falhar, o aluno não perde as respostas (regra inegociável §12)
    const rawAnswers: StudentAnswer[] = content.questions.map((question) => {
      const answer = answersByQuestion.get(question.id);
      return {
        question_id: question.id,
        selected_option_id:
          (answer?.selected_option_id as StudentAnswer['selected_option_id']) ??
          null,
        essay_text: answer?.essay_text?.slice(0, EXAM_ESSAY_MAX_CHARS) ?? null,
        verdict: null,
        feedback: null,
      };
    });
    await this.prisma.exam.update({
      where: { id: exam.id },
      data: {
        student_answers_json: {
          answers: rawAnswers,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // MC corrigida em código; dissertativa em branco nem vai à IA
    const { mcItems, essayItems, precomputed } = this.prepareCorrection(
      content,
      rawAnswers,
    );

    await this.assertTokenBudget(userId, institutionId);

    const correction = await this.callStructuredWithRetry<CorrectionResponse>(
      {
        system: buildExamCorrectionSystemPrompt(student.cognitive_profile),
        messages: [
          {
            role: 'user',
            content: buildExamCorrectionUserContent({ mcItems, essayItems }),
          },
        ],
        maxTokens: EXAM_CORRECTION_MAX_TOKENS,
        jsonSchema: correctionJsonSchema,
      },
      (data) => this.validateCorrection(data, mcItems, essayItems),
      { userId, institutionId },
      'La IA no devolvió una corrección válida',
    );

    const gradedAnswers = this.mergeCorrection(
      rawAnswers,
      precomputed,
      correction,
    );

    const finalScore = gradedAnswers.filter(
      (answer) => answer.verdict === 'correct',
    ).length;
    const completedAt = new Date();
    const executionTime = Math.max(
      1,
      Math.round((completedAt.getTime() - exam.created_at.getTime()) / 1000),
    );
    const resultSummary = buildResultSummary(finalScore, student.user.name);

    await this.prisma.exam.update({
      where: { id: exam.id },
      data: {
        student_answers_json: {
          answers: gradedAnswers,
        } as unknown as Prisma.InputJsonValue,
        final_score: finalScore,
        result_summary: resultSummary,
        completed_at: completedAt,
        execution_time: executionTime,
      },
    });

    await this.studentMetricsService.updateAfterExam(
      student.id,
      exam.subject_id,
      { examType: exam.exam_type, executionTime },
    );

    // Só o exame main marca o tópico como completed; retry não (§12)
    if (exam.exam_type === ExamType.main) {
      await this.topicProgressService.markAsCompleted(
        student.id,
        exam.topic_id,
      );
    }

    // Sinal de atividade pedagógica (fire-and-forget — não bloqueia a resposta)
    void Promise.resolve(
      this.prisma.student.update({
        where: { id: student.id },
        data: { last_activity_at: completedAt },
      }),
    ).catch(() => undefined);

    // Avalia DIFFICULTY + auto-resolve (evento, depois de persistir o resultado)
    await this.alertRulesService.evaluateDifficulty({
      studentId: student.id,
      topicId: exam.topic_id,
      subjectId: exam.subject_id,
      institutionId,
    });

    return toResultDto({
      id: exam.id,
      final_score: finalScore,
      result_summary: resultSummary,
      completed_at: completedAt,
      execution_time: executionTime,
      exam_content_json: content,
      student_answers_json: { answers: gradedAnswers },
    });
  }

  // ─── Releitura (GET /exams/:id) — custo zero, sem IA ─────────────────────

  async getResult(
    userId: string,
    institutionId: string,
    examId: string,
  ): Promise<ExamResultDto> {
    const student = await this.loadStudent(userId, institutionId);
    const exam = await this.loadOwnExam(examId, student.id);
    if (exam.completed_at == null) {
      throw new BadRequestException('El examen aún no fue completado');
    }
    return toResultDto(exam);
  }

  // ─── Blocos internos ──────────────────────────────────────────────────────

  private async loadStudent(userId: string, institutionId: string) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
      include: { user: true },
    });
    if (!student) throw new NotFoundException('Alumno no encontrado');
    if (student.user.institution_id !== institutionId) {
      throw new ForbiddenException('El alumno no pertenece a la institución');
    }
    return student;
  }

  // Isolamento por cadeia de JOIN (CLAUDE.md §5):
  // topic → module → subject → course → institution_id
  private async loadTopicInTenant(topicId: string, institutionId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        module: { include: { subject: { include: { course: true } } } },
      },
    });
    if (!topic) throw new NotFoundException('Tema no encontrado');
    if (topic.module.subject.course.institution_id !== institutionId) {
      throw new ForbiddenException('El tema no pertenece a la institución');
    }
    return topic;
  }

  private async assertTokenBudget(userId: string, institutionId: string) {
    const canProceed = await this.aiUsageService.hasAvailableTokens(
      userId,
      institutionId,
    );
    if (!canProceed) {
      throw new ForbiddenException('Límite de tokens de IA alcanzado');
    }
  }

  private async loadOwnExam(examId: string, studentId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Examen no encontrado');
    if (exam.student_id !== studentId) {
      throw new ForbiddenException('El examen no pertenece al alumno');
    }
    return exam;
  }

  // Questões erradas do exame de origem, na ordem original do conteúdo
  private async loadMissedQuestions(
    sourceExamId: string | undefined,
    studentId: string,
  ) {
    if (!sourceExamId) {
      throw new BadRequestException(
        'source_exam_id es obligatorio para exámenes de práctica',
      );
    }

    const source = await this.prisma.exam.findUnique({
      where: { id: sourceExamId },
    });
    if (!source) throw new NotFoundException('Examen de origen no encontrado');
    if (source.student_id !== studentId) {
      throw new ForbiddenException(
        'El examen de origen no pertenece al alumno',
      );
    }
    if (source.completed_at == null) {
      throw new BadRequestException(
        'El examen de origen aún no fue completado',
      );
    }

    const content = source.exam_content_json as unknown as ExamContent;
    const answers =
      (source.student_answers_json as unknown as { answers?: StudentAnswer[] })
        ?.answers ?? [];
    const incorrectIds = new Set(
      answers
        .filter((answer) => answer.verdict === 'incorrect')
        .map((answer) => answer.question_id),
    );

    const missed = content.questions.filter((question) =>
      incorrectIds.has(question.id),
    );
    if (missed.length === 0) {
      throw new UnprocessableEntityException(
        'El examen de origen no tiene preguntas falladas para practicar',
      );
    }
    return missed;
  }

  private assertAllQuestionsAnswered(
    content: ExamContent,
    dto: SubmitAnswersDto,
  ) {
    const answersByQuestion = new Map(
      dto.answers.map((answer) => [answer.question_id, answer]),
    );
    const allAnswered = content.questions.every((question) =>
      answersByQuestion.has(question.id),
    );
    if (!allAnswered || dto.answers.length !== content.questions.length) {
      throw new BadRequestException(
        'Todas las preguntas deben ser respondidas',
      );
    }
    return answersByQuestion;
  }

  // Separa o que vai à IA do que é decidido em código:
  // - MC: verdict determinístico (selected === correct) — IA só gera feedback
  // - dissertativa em branco: incorrect com feedback constante, fora do batch
  private prepareCorrection(content: ExamContent, rawAnswers: StudentAnswer[]) {
    const answersByQuestion = new Map(
      rawAnswers.map((answer) => [answer.question_id, answer]),
    );
    const mcItems: CorrectionMcItem[] = [];
    const essayItems: CorrectionEssayItem[] = [];
    const precomputed = new Map<
      string,
      { verdict: 'correct' | 'incorrect'; feedback: string | null }
    >();

    for (const question of content.questions) {
      const answer = answersByQuestion.get(question.id);
      if (question.type === 'multiple_choice') {
        const verdict =
          answer?.selected_option_id === question.correct_option_id
            ? 'correct'
            : 'incorrect';
        precomputed.set(question.id, { verdict, feedback: null });
        mcItems.push({
          question_id: question.id,
          statement: question.statement,
          options: question.options,
          correct_option_id: question.correct_option_id,
          rationale: question.rationale,
          selected_option_id: answer?.selected_option_id ?? null,
          verdict,
        });
      } else {
        const essayText = answer?.essay_text?.trim() ?? '';
        if (essayText.length === 0) {
          precomputed.set(question.id, {
            verdict: 'incorrect',
            feedback: EXAM_BLANK_ESSAY_FEEDBACK,
          });
        } else {
          essayItems.push({
            question_id: question.id,
            statement: question.statement,
            key_points: question.key_points,
            essay_text: essayText,
          });
        }
      }
    }

    return { mcItems, essayItems, precomputed };
  }

  // Valida a resposta da chamada 2: enum normalizado (case-insensitive),
  // todos os itens enviados presentes e verdict das dissertativas definido
  private validateCorrection(
    data: unknown,
    mcItems: CorrectionMcItem[],
    essayItems: CorrectionEssayItem[],
  ): CorrectionResponse | null {
    const parsed = correctionResponseSchema.safeParse(
      normalizeCorrectionPayload(data),
    );
    if (!parsed.success) return null;

    const resultsByQuestion = new Map(
      parsed.data.results.map((result) => [result.question_id, result]),
    );
    const mcCovered = mcItems.every((item) =>
      resultsByQuestion.has(item.question_id),
    );
    const essaysCovered = essayItems.every(
      (item) => resultsByQuestion.get(item.question_id)?.verdict != null,
    );
    return mcCovered && essaysCovered ? parsed.data : null;
  }

  private mergeCorrection(
    rawAnswers: StudentAnswer[],
    precomputed: Map<
      string,
      { verdict: 'correct' | 'incorrect'; feedback: string | null }
    >,
    correction: CorrectionResponse,
  ): StudentAnswer[] {
    const resultsByQuestion = new Map(
      correction.results.map((result) => [result.question_id, result]),
    );

    return rawAnswers.map((answer) => {
      const decided = precomputed.get(answer.question_id);
      const aiResult = resultsByQuestion.get(answer.question_id);

      // O verdict pré-computado (MC e dissertativa em branco) sempre vence —
      // a IA não decide MC (§12); o feedback vem da IA quando existir
      const verdict = decided?.verdict ?? aiResult?.verdict ?? 'incorrect';
      const feedback = decided?.feedback ?? aiResult?.feedback ?? null;

      return { ...answer, verdict, feedback };
    });
  }

  // Chamada estruturada com 1 retry para truncamento/conteúdo inválido → 502.
  // Toda chamada que retorna da API é registrada em AI_Usage (§11) — inclusive
  // as que produzem conteúdo inválido (tokens foram consumidos).
  private async callStructuredWithRetry<T>(
    options: {
      system: string;
      messages: { role: 'user' | 'assistant'; content: string }[];
      maxTokens: number;
      jsonSchema: Record<string, unknown>;
    },
    validate: (data: unknown) => T | null,
    usageContext: { userId: string; institutionId: string },
    failureMessage: string,
  ): Promise<T> {
    const MAX_ATTEMPTS = 2;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // A segunda tentativa também é uma nova chamada à IA e precisa passar
      // novamente pelo gate de tokens (CLAUDE.md §11).
      if (attempt > 1) {
        await this.assertTokenBudget(
          usageContext.userId,
          usageContext.institutionId,
        );
      }

      let data: unknown;
      try {
        const result = await this.aiProviderService.completeStructured({
          ...options,
        });
        await this.registerUsage(
          usageContext,
          result.promptTokens,
          result.responseTokens,
        );
        data = result.data;
      } catch (error) {
        // Truncamento por max_tokens quebra o JSON — conta como tentativa
        if (error instanceof AIResponseTruncatedError) {
          await this.registerUsage(
            usageContext,
            error.promptTokens,
            error.responseTokens,
          );
          continue;
        }
        throw error;
      }

      const validated = validate(data);
      if (validated !== null) return validated;
    }

    throw new BadGatewayException(failureMessage);
  }

  private async registerUsage(
    context: { userId: string; institutionId: string },
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
}
