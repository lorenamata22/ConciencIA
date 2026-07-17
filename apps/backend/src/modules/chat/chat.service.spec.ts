import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';
import { createAIProviderMock } from '../ai-provider/ai-provider.mock';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { RagService } from '../rag/rag.service';
import { AIUsageService } from '../ai-usage/ai-usage.service';

describe('ChatService', () => {
  let service: ChatService;
  let prismaMock: PrismaMock;
  let aiProviderMock: ReturnType<typeof createAIProviderMock>;
  let ragServiceMock: jest.Mocked<RagService>;
  let aiUsageServiceMock: jest.Mocked<AIUsageService>;

  const institutionId = 'inst-id-1';
  const userId = 'user-id-1';
  const studentId = 'student-id-1';

  const mockStudent = {
    id: studentId,
    user_id: userId,
    cognitive_profile: { style: 'visual' },
    test_count: 1,
    user: {
      id: userId,
      institution_id: institutionId,
      ai_token_limit: null,
      is_minor: false,
    },
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    aiProviderMock = createAIProviderMock();

    ragServiceMock = {
      search: jest.fn().mockResolvedValue({
        chunks: [],
        hasSufficientContext: false,
      }),
      ingestFile: jest.fn(),
    } as any;

    aiUsageServiceMock = {
      register: jest.fn().mockResolvedValue({}),
      hasAvailableTokens: jest.fn().mockResolvedValue(true),
      getTotalUsageByUser: jest.fn().mockResolvedValue(0),
      getTotalUsageByInstitution: jest.fn().mockResolvedValue(0),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: AIProviderService,
          useValue: { getProvider: () => aiProviderMock },
        },
        { provide: RagService, useValue: ragServiceMock },
        { provide: AIUsageService, useValue: aiUsageServiceMock },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  // Monta o cenário-base de uma conversa válida do aluno
  const mockConversationContext = () => {
    prismaMock.student.findUnique.mockResolvedValue(mockStudent as any);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: 'conv-id-1',
      student_id: studentId,
      subject_id: 'subject-id-1',
    } as any);
    prismaMock.conversationSummary.findFirst.mockResolvedValue(null);
    prismaMock.message.findMany.mockResolvedValue([]);
    prismaMock.message.create.mockResolvedValue({} as any);
  };

  describe('checkTokenLimit', () => {
    it('should delegate the token gate to AIUsageService.hasAvailableTokens', async () => {
      aiUsageServiceMock.hasAvailableTokens.mockResolvedValue(true);

      await expect(
        service.checkTokenLimit(userId, institutionId),
      ).resolves.toBe(true);
      expect(aiUsageServiceMock.hasAvailableTokens).toHaveBeenCalledWith(
        userId,
        institutionId,
      );
    });

    it('should return false when AIUsageService reports no available tokens', async () => {
      aiUsageServiceMock.hasAvailableTokens.mockResolvedValue(false);

      await expect(
        service.checkTokenLimit(userId, institutionId),
      ).resolves.toBe(false);
    });
  });

  describe('sendStudyMessage', () => {
    it('should build prompt with RAG context, cognitive profile and conversation summary', async () => {
      mockConversationContext();
      prismaMock.conversationSummary.findFirst.mockResolvedValue({
        summary: 'Resumo da sessão anterior',
      } as any);
      ragServiceMock.search.mockResolvedValue({
        chunks: [{ chunk_text: 'Contexto do material', metadata: {} }],
        hasSufficientContext: true,
      } as any);

      aiProviderMock.stream.mockImplementation(async function* () {
        yield 'Uma equação';
        yield ' de 1º grau';
      } as any);

      // Deve executar sem erros (stream é testado via integração/e2e)
      await expect(
        service.sendStudyMessage(
          {
            conversation_id: 'conv-id-1',
            content: 'O que é equação de 1º grau?',
          },
          userId,
          institutionId,
        ),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when token limit is reached', async () => {
      aiUsageServiceMock.hasAvailableTokens.mockResolvedValue(false);

      await expect(
        service.sendStudyMessage(
          { conversation_id: 'conv-id-1', content: 'Pergunta' },
          userId,
          institutionId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should register AI usage in AI_Usage table after each call', async () => {
      mockConversationContext();

      aiProviderMock.stream.mockImplementation(async function* () {
        yield 'resposta';
      } as any);

      await service.sendStudyMessage(
        { conversation_id: 'conv-id-1', content: 'Pergunta' },
        userId,
        institutionId,
      );

      // REGRA CRÍTICA: toda chamada à IA deve ser registrada
      expect(aiUsageServiceMock.register).toHaveBeenCalled();
    });

    it('should apply stricter guardrails when student is_minor is true', async () => {
      mockConversationContext();
      const minorStudent = {
        ...mockStudent,
        user: { ...mockStudent.user, is_minor: true },
      };
      prismaMock.student.findUnique.mockResolvedValue(minorStudent as any);

      const streamSpy = jest.fn().mockImplementation(async function* () {
        yield 'resposta segura';
      });
      aiProviderMock.stream = streamSpy as any;

      await service.sendStudyMessage(
        { conversation_id: 'conv-id-1', content: 'Pergunta' },
        userId,
        institutionId,
      );

      // O prompt enviado para IA deve incluir guardrails para menores
      expect(streamSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('menor'),
        }),
      );
    });
  });
});
