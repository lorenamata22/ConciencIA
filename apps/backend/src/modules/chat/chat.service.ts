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

// Estimativa usada apenas quando o stream não reporta tokens reais
// (ex: cliente desconectou no meio) — ~4 chars por token
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

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

    const { chunks, hasSufficientContext } = await this.searchRag(
      input.content,
      institutionId,
      conversation.subject_id,
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
      include: { subject: true },
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
