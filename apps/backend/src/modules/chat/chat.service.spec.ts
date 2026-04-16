import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';
import { createAIProviderMock } from '../ai-provider/ai-provider.mock';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { RagService } from '../rag/rag.service';
import { AIUsageService } from '../ai-usage/ai-usage.service';
import { ExamService } from '../exam/exam.service';
import { TopicProgressService } from '../topic-progress/topic-progress.service';

describe('ChatService', () => {
  let service: ChatService;
  let prismaMock: PrismaMock;
  let aiProviderMock: ReturnType<typeof createAIProviderMock>;
  let ragServiceMock: jest.Mocked<RagService>;
  let aiUsageServiceMock: jest.Mocked<AIUsageService>;
  let examServiceMock: jest.Mocked<ExamService>;
  let topicProgressServiceMock: jest.Mocked<TopicProgressService>;

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

  const mockInstitution = {
    id: institutionId,
    ai_token_limit: 1000000,
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    aiProviderMock = createAIProviderMock();

    ragServiceMock = {
      search: jest.fn().mockResolvedValue([]),
      ingestFile: jest.fn(),
    } as any;

    aiUsageServiceMock = {
      register: jest.fn().mockResolvedValue({}),
      getTotalUsageByUser: jest.fn().mockResolvedValue(0),
      getTotalUsageByInstitution: jest.fn().mockResolvedValue(0),
    } as any;

    examServiceMock = {
      detectExamComplete: jest.fn().mockReturnValue(false),
      complete: jest.fn().mockResolvedValue({}),
      calculateScore: jest.fn().mockResolvedValue(8),
      create: jest.fn().mockResolvedValue({}),
      findByStudent: jest.fn(),
    } as any;

    topicProgressServiceMock = {
      markAsCompleted: jest.fn().mockResolvedValue({}),
      upsert: jest.fn(),
      findByStudent: jest.fn(),
      getByStudentAndSubject: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AIProviderService, useValue: { getProvider: () => aiProviderMock } },
        { provide: RagService, useValue: ragServiceMock },
        { provide: AIUsageService, useValue: aiUsageServiceMock },
        { provide: ExamService, useValue: examServiceMock },
        { provide: TopicProgressService, useValue: topicProgressServiceMock },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('checkTokenLimit', () => {
    it('should allow call when user has no individual limit (use institution limit)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockStudent.user,
        ai_token_limit: null,
      } as any);
      prismaMock.institution.findUnique.mockResolvedValue(mockInstitution as any);
      aiUsageServiceMock.getTotalUsageByInstitution.mockResolvedValue(500000);

      const canProceed = await service.checkTokenLimit(userId, institutionId);
      expect(canProceed).toBe(true);
    });

    it('should block call when institution token limit is reached', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockStudent.user,
        ai_token_limit: null,
      } as any);
      prismaMock.institution.findUnique.mockResolvedValue(mockInstitution as any);
      // Consumiu 100% do limite
      aiUsageServiceMock.getTotalUsageByInstitution.mockResolvedValue(1000000);

      const canProceed = await service.checkTokenLimit(userId, institutionId);
      expect(canProceed).toBe(false);
    });

    it('should use user limit when User.ai_token_limit is set (takes priority)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockStudent.user,
        ai_token_limit: 10000,
      } as any);
      aiUsageServiceMock.getTotalUsageByUser.mockResolvedValue(9999);

      const canProceed = await service.checkTokenLimit(userId, institutionId);
      expect(canProceed).toBe(true);
    });

    it('should block call when user individual limit is reached', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockStudent.user,
        ai_token_limit: 10000,
      } as any);
      aiUsageServiceMock.getTotalUsageByUser.mockResolvedValue(10000);

      const canProceed = await service.checkTokenLimit(userId, institutionId);
      expect(canProceed).toBe(false);
    });
  });

  describe('sendStudyMessage', () => {
    it('should build prompt with RAG context, cognitive profile and conversation summary', async () => {
      prismaMock.student.findUnique.mockResolvedValue(mockStudent as any);
      prismaMock.user.findUnique.mockResolvedValue(mockStudent.user as any);
      prismaMock.institution.findUnique.mockResolvedValue(mockInstitution as any);
      prismaMock.conversationSummary.findFirst.mockResolvedValue({
        summary: 'Resumo da sessão anterior',
      } as any);
      ragServiceMock.search.mockResolvedValue([
        { chunk_text: 'Contexto do material', metadata: {} },
      ] as any);
      aiUsageServiceMock.getTotalUsageByInstitution.mockResolvedValue(0);

      const chunks: string[] = [];
      aiProviderMock.stream.mockImplementation(async function* () {
        yield 'Uma equação';
        yield ' de 1º grau';
      } as any);

      prismaMock.message.create.mockResolvedValue({} as any);
      prismaMock.conversation.findUnique.mockResolvedValue({
        id: 'conv-id-1',
        student_id: studentId,
        subject_id: 'subject-id-1',
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
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockStudent.user,
        ai_token_limit: 100,
      } as any);
      aiUsageServiceMock.getTotalUsageByUser.mockResolvedValue(100);

      await expect(
        service.sendStudyMessage(
          { conversation_id: 'conv-id-1', content: 'Pergunta' },
          userId,
          institutionId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should register AI usage in AI_Usage table after each call', async () => {
      prismaMock.student.findUnique.mockResolvedValue(mockStudent as any);
      prismaMock.user.findUnique.mockResolvedValue(mockStudent.user as any);
      prismaMock.institution.findUnique.mockResolvedValue(mockInstitution as any);
      prismaMock.conversationSummary.findFirst.mockResolvedValue(null);
      ragServiceMock.search.mockResolvedValue([]);
      aiUsageServiceMock.getTotalUsageByInstitution.mockResolvedValue(0);
      prismaMock.message.create.mockResolvedValue({} as any);
      prismaMock.conversation.findUnique.mockResolvedValue({
        id: 'conv-id-1',
        student_id: studentId,
        subject_id: 'subject-id-1',
      } as any);

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
      const minorStudent = {
        ...mockStudent,
        user: { ...mockStudent.user, is_minor: true },
      };

      prismaMock.student.findUnique.mockResolvedValue(minorStudent as any);
      prismaMock.user.findUnique.mockResolvedValue(minorStudent.user as any);
      prismaMock.institution.findUnique.mockResolvedValue(mockInstitution as any);
      prismaMock.conversationSummary.findFirst.mockResolvedValue(null);
      ragServiceMock.search.mockResolvedValue([]);
      aiUsageServiceMock.getTotalUsageByInstitution.mockResolvedValue(0);
      prismaMock.message.create.mockResolvedValue({} as any);
      prismaMock.conversation.findUnique.mockResolvedValue({
        id: 'conv-id-1',
        student_id: studentId,
        subject_id: 'subject-id-1',
      } as any);

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

  describe('sendExamMessage', () => {
    it('should send complete conversation history (not summary) in exam mode', async () => {
      prismaMock.student.findUnique.mockResolvedValue(mockStudent as any);
      prismaMock.user.findUnique.mockResolvedValue(mockStudent.user as any);
      prismaMock.institution.findUnique.mockResolvedValue(mockInstitution as any);
      prismaMock.conversation.findUnique.mockResolvedValue({
        id: 'conv-id-1',
        student_id: studentId,
        subject_id: 'subject-id-1',
        topic_id: 'topic-id-1',
      } as any);
      prismaMock.message.findMany.mockResolvedValue([
        { role: 'assistant', content: 'Pergunta 1?' },
        { role: 'user', content: 'Resposta 1' },
      ] as any);
      ragServiceMock.search.mockResolvedValue([]);
      aiUsageServiceMock.getTotalUsageByInstitution.mockResolvedValue(0);
      examServiceMock.detectExamComplete.mockReturnValue(false);

      const streamSpy = jest.fn().mockImplementation(async function* () {
        yield 'Pergunta 2?';
      });
      aiProviderMock.stream = streamSpy as any;
      prismaMock.message.create.mockResolvedValue({} as any);

      await service.sendExamMessage(
        { conversation_id: 'conv-id-1', content: 'Resposta 1' },
        userId,
        institutionId,
      );

      // Histório completo enviado — NÃO apenas resumo
      expect(streamSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'assistant', content: 'Pergunta 1?' }),
            expect.objectContaining({ role: 'user', content: 'Resposta 1' }),
          ]),
        }),
      );
    });

    it('should detect [EXAM_COMPLETE] tag and finalize exam', async () => {
      prismaMock.student.findUnique.mockResolvedValue(mockStudent as any);
      prismaMock.user.findUnique.mockResolvedValue(mockStudent.user as any);
      prismaMock.institution.findUnique.mockResolvedValue(mockInstitution as any);
      prismaMock.conversation.findUnique.mockResolvedValue({
        id: 'conv-id-1',
        student_id: studentId,
        subject_id: 'subject-id-1',
        topic_id: 'topic-id-1',
      } as any);
      prismaMock.message.findMany.mockResolvedValue([]);
      ragServiceMock.search.mockResolvedValue([]);
      aiUsageServiceMock.getTotalUsageByInstitution.mockResolvedValue(0);
      prismaMock.message.create.mockResolvedValue({} as any);

      // IA retorna tag de conclusão
      examServiceMock.detectExamComplete.mockReturnValue(true);
      aiProviderMock.stream.mockImplementation(async function* () {
        yield 'Parabéns! [EXAM_COMPLETE]';
      } as any);

      // Exam precisa existir na sessão
      prismaMock.exam.findFirst.mockResolvedValue({ id: 'exam-id-1' } as any);

      await service.sendExamMessage(
        { conversation_id: 'conv-id-1', content: 'Resposta final' },
        userId,
        institutionId,
      );

      // Deve finalizar o exam e marcar tópico como completed
      expect(examServiceMock.complete).toHaveBeenCalled();
      expect(topicProgressServiceMock.markAsCompleted).toHaveBeenCalledWith(
        studentId,
        'topic-id-1',
      );
    });

    it('should mark topic as completed ONLY after [EXAM_COMPLETE] is detected', async () => {
      prismaMock.student.findUnique.mockResolvedValue(mockStudent as any);
      prismaMock.user.findUnique.mockResolvedValue(mockStudent.user as any);
      prismaMock.institution.findUnique.mockResolvedValue(mockInstitution as any);
      prismaMock.conversation.findUnique.mockResolvedValue({
        id: 'conv-id-1',
        student_id: studentId,
        subject_id: 'subject-id-1',
        topic_id: 'topic-id-1',
      } as any);
      prismaMock.message.findMany.mockResolvedValue([]);
      ragServiceMock.search.mockResolvedValue([]);
      aiUsageServiceMock.getTotalUsageByInstitution.mockResolvedValue(0);
      prismaMock.message.create.mockResolvedValue({} as any);

      // Exame ainda não terminou
      examServiceMock.detectExamComplete.mockReturnValue(false);
      aiProviderMock.stream.mockImplementation(async function* () {
        yield 'Boa resposta! Próxima pergunta...';
      } as any);

      await service.sendExamMessage(
        { conversation_id: 'conv-id-1', content: 'Resposta 3' },
        userId,
        institutionId,
      );

      // NÃO deve marcar como completed antes do exame terminar
      expect(topicProgressServiceMock.markAsCompleted).not.toHaveBeenCalled();
    });

    it('should register AI usage after each exam message', async () => {
      prismaMock.student.findUnique.mockResolvedValue(mockStudent as any);
      prismaMock.user.findUnique.mockResolvedValue(mockStudent.user as any);
      prismaMock.institution.findUnique.mockResolvedValue(mockInstitution as any);
      prismaMock.conversation.findUnique.mockResolvedValue({
        id: 'conv-id-1',
        student_id: studentId,
        subject_id: 'subject-id-1',
        topic_id: 'topic-id-1',
      } as any);
      prismaMock.message.findMany.mockResolvedValue([]);
      ragServiceMock.search.mockResolvedValue([]);
      aiUsageServiceMock.getTotalUsageByInstitution.mockResolvedValue(0);
      prismaMock.message.create.mockResolvedValue({} as any);
      examServiceMock.detectExamComplete.mockReturnValue(false);

      aiProviderMock.stream.mockImplementation(async function* () {
        yield 'Próxima pergunta';
      } as any);

      await service.sendExamMessage(
        { conversation_id: 'conv-id-1', content: 'Resposta' },
        userId,
        institutionId,
      );

      expect(aiUsageServiceMock.register).toHaveBeenCalled();
    });
  });
});
