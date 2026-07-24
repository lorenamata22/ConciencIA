import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { AIMessage, AIStreamUsage } from '../ai-provider/ai-provider.interface';
import { RagService } from '../rag/rag.service';
import { AIUsageService } from '../ai-usage/ai-usage.service';
import { buildStudyModeSystemPrompt } from './prompts/study-mode.prompt';

export interface SendMessageInput {
  conversation_id: string;
  content: string;
}

export interface SendMessageResult {
  content: string;
  promptTokens: number;
  responseTokens: number;
}

// Modo Estudo: histórico truncado (últimas N mensagens brutas) — a geração
// de Conversation_Summary fica para a sprint do prompt "Resumo de Sessão"
const STUDY_HISTORY_LIMIT = 10;

// Top K do chat, acima do DEFAULT_TOP_K (5) do RagService. Como o material
// hoje é indexado por matéria (topic_id NULL nos embeddings), o corpus de uma
// pergunta é a matéria inteira — um livro único pode cobrir 50 tópicos. Top 5
// vira contexto raso; o corte por MAX_COSINE_DISTANCE descarta o irrelevante,
// então o custo real são só os chunks que sobrevivem ao corte.
export const STUDY_TOP_K = 8;

// Estimativa usada apenas quando o stream não reporta tokens reais
// (ex: cliente desconectou no meio) — ~4 chars por token
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// Ancora a busca no tópico em foco. Mesma técnica já usada na geração de
// exame (ExamService.generate), que embeda título + ementa do tópico: sem a
// âncora, "explícame esto" não tem sinal nenhum de QUAL tópico o aluno está
// estudando e recupera qualquer coisa da matéria.
// Topic.description é a ementa verbatim do programa (§14) — é o melhor texto
// disponível para casar contra as páginas certas do material.
// A mensagem do aluno vem por último e é o sinal mais específico.
const buildTopicAnchoredQuery = (
  topic: { title?: string | null; description?: string | null } | null,
  message: string,
): string =>
  [topic?.title, topic?.description, message]
    .filter((part): part is string => Boolean(part?.trim()))
    .join('\n');

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProviderService: AIProviderService,
    private readonly ragService: RagService,
    private readonly aiUsageService: AIUsageService,
  ) {}

  // Gate de tokens (CLAUDE.md §11) — lógica centralizada no AIUsageService
  async checkTokenLimit(
    userId: string,
    institutionId: string,
  ): Promise<boolean> {
    return this.aiUsageService.hasAvailableTokens(userId, institutionId);
  }

  // Modo Estudo: RAG da matéria + perfil cognitivo + resumo/últimas mensagens
  async sendStudyMessage(
    input: SendMessageInput,
    userId: string,
    institutionId: string,
    onChunk?: (text: string) => void,
  ): Promise<SendMessageResult> {
    const { student, conversation } = await this.loadContext(
      input,
      userId,
      institutionId,
    );

    // Sinal de atividade pedagógica p/ alertas (fire-and-forget — não bloqueia)
    void Promise.resolve(
      this.prisma.student.update({
        where: { id: student.id },
        data: { last_activity_at: new Date() },
      }),
    ).catch(() => undefined);

    const { chunks, hasSufficientContext } = await this.searchRag(
      buildTopicAnchoredQuery(conversation.topic, input.content),
      institutionId,
      conversation.subject_id,
      conversation.topic_id,
    );

    const summary = await this.prisma.conversationSummary.findFirst({
      where: { conversation_id: conversation.id },
      orderBy: { created_at: 'desc' },
    });

    // Últimas N mensagens em ordem cronológica como histórico truncado
    const recentMessages =
      (await this.prisma.message.findMany({
        where: { conversation_id: conversation.id },
        orderBy: { created_at: 'desc' },
        take: STUDY_HISTORY_LIMIT,
      })) ?? [];
    const history: AIMessage[] = recentMessages
      .reverse()
      .map((message) => ({ role: message.role, content: message.content }));

    const system = buildStudyModeSystemPrompt({
      subjectName: conversation.subject?.name ?? 'la asignatura',
      topicDescription: conversation.topic?.description ?? null,
      ragChunks: chunks,
      hasSufficientContext,
      cognitiveProfile: student.cognitive_profile,
      summary: summary?.summary ?? null,
      isMinor: student.user.is_minor,
    });

    return this.streamAndPersist({
      system,
      history,
      input,
      userId,
      institutionId,
      conversationId: conversation.id,
      onChunk,
    });
  }

  // ── Blocos internos ───────────────────────────────────────────────────

  private async loadContext(
    input: SendMessageInput,
    userId: string,
    institutionId: string,
  ) {
    const canProceed = await this.checkTokenLimit(userId, institutionId);
    if (!canProceed) {
      throw new ForbiddenException('Límite de tokens de IA alcanzado');
    }

    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
      include: { user: true },
    });
    if (!student) {
      throw new NotFoundException('Alumno no encontrado');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: input.conversation_id },
      include: { subject: true, topic: true },
    });
    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }
    if (conversation.student_id !== student.id) {
      throw new ForbiddenException('La conversación no pertenece al alumno');
    }

    return { student, conversation };
  }

  // Normaliza o retorno do RagService ({chunks, hasSufficientContext})
  private async searchRag(
    query: string,
    institutionId: string,
    subjectId: string,
    topicId?: string,
  ): Promise<{ chunks: string[]; hasSufficientContext: boolean }> {
    const result = await this.ragService.search({
      query,
      institutionId,
      subjectId,
      topicId,
      topK: STUDY_TOP_K,
    });

    const rawChunks = Array.isArray(result) ? result : (result?.chunks ?? []);
    const chunks = rawChunks.map(
      (chunk: { chunk_text: string }) => chunk.chunk_text,
    );
    const hasSufficientContext = Array.isArray(result)
      ? chunks.length > 0
      : (result?.hasSufficientContext ?? false);

    return { chunks, hasSufficientContext };
  }

  // Persiste a mensagem do aluno, consome o stream e SEMPRE registra
  // AI_Usage no finally — com tokens reais se o provider reportou (onUsage),
  // senão com estimativa (regra inegociável §11: nenhuma chamada sem registro)
  private async streamAndPersist(params: {
    system: string;
    history: AIMessage[];
    input: SendMessageInput;
    userId: string;
    institutionId: string;
    conversationId: string;
    onChunk?: (text: string) => void;
  }): Promise<SendMessageResult> {
    const { system, history, input, userId, institutionId, conversationId } =
      params;

    await this.prisma.message.create({
      data: {
        conversation_id: conversationId,
        role: MessageRole.user,
        content: input.content,
        prompt_tokens: estimateTokens(input.content),
        response_tokens: 0,
      },
    });

    const provider = this.aiProviderService.getProvider();
    const messages: AIMessage[] = [
      ...history,
      { role: 'user', content: input.content },
    ];

    let fullText = '';
    let promptTokens = 0;
    let responseTokens = 0;
    // Holder de objeto (em vez de let) — o TS não enxerga a atribuição feita
    // dentro do callback onUsage e estreitaria a variável para null
    const usageHolder: { reported: AIStreamUsage | null } = { reported: null };

    try {
      const stream = provider.stream({
        system,
        messages,
        onUsage: (reported) => {
          usageHolder.reported = reported;
        },
      });
      for await (const chunk of stream) {
        fullText += chunk;
        params.onChunk?.(chunk);
      }
    } finally {
      promptTokens =
        usageHolder.reported?.promptTokens ??
        estimateTokens(
          system + messages.map((message) => message.content).join(''),
        );
      responseTokens =
        usageHolder.reported?.responseTokens ?? estimateTokens(fullText);

      if (fullText.length > 0) {
        await this.prisma.message.create({
          data: {
            conversation_id: conversationId,
            role: MessageRole.assistant,
            content: fullText,
            prompt_tokens: promptTokens,
            response_tokens: responseTokens,
          },
        });
      }

      await this.aiUsageService.register({
        institution_id: institutionId,
        user_id: userId,
        conversation_id: conversationId,
        provider: provider.getProviderName(),
        model: provider.getModelName?.() ?? provider.getProviderName(),
        prompt_tokens: promptTokens,
        response_tokens: responseTokens,
        cost: 0,
      });
    }

    return { content: fullText, promptTokens, responseTokens };
  }
}
