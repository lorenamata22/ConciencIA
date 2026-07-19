import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RagCoverageService } from './rag-coverage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { AIUsageService } from '../ai-usage/ai-usage.service';
import { RagService } from '../rag/rag.service';

describe('RagCoverageService', () => {
  let service: RagCoverageService;
  let prismaMock: PrismaMock;
  let ragServiceMock: jest.Mocked<RagService>;
  let aiUsageServiceMock: jest.Mocked<AIUsageService>;

  const institutionId = 'inst-id-1';
  const userId = 'user-id-1';
  const subjectId = 'subject-id-1';

  const mockSubject = {
    id: subjectId,
    name: 'Matemáticas',
    modules: [
      {
        id: 'module-id-1',
        name: 'Álgebra',
        order: 0,
        topics: [
          {
            id: 'topic-a',
            title: 'Ecuaciones de primer grado',
            description: 'Despejar la incógnita',
            order: 0,
          },
          {
            id: 'topic-b',
            title: 'Inecuaciones',
            description: null,
            order: 1,
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    ragServiceMock = {
      probeTopicCoverage: jest.fn().mockResolvedValue({
        results: [
          {
            topic_id: 'topic-a',
            covered: true,
            best_distance: 0.2,
            document_name: 'libro.pdf',
          },
          {
            topic_id: 'topic-b',
            covered: false,
            best_distance: 0.7,
            document_name: null,
          },
        ],
        estimatedTokens: 42,
        model: 'gemini-embedding-001',
      }),
    } as any;

    aiUsageServiceMock = {
      register: jest.fn().mockResolvedValue({}),
      hasAvailableTokens: jest.fn().mockResolvedValue(true),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagCoverageService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: AIProviderService,
          useValue: {
            getProvider: () => ({
              getProviderName: () => 'gemini',
              // Modelo de TEXTO — não é o que a sonda usa
              getModelName: () => 'gemini-3.1-flash-lite',
            }),
          },
        },
        { provide: AIUsageService, useValue: aiUsageServiceMock },
        { provide: RagService, useValue: ragServiceMock },
      ],
    }).compile();

    service = module.get<RagCoverageService>(RagCoverageService);
    prismaMock.subject.findFirst.mockResolvedValue(mockSubject as any);
  });

  it('should return coverage per topic grouped by module', async () => {
    const result = await service.getCoverage(institutionId, subjectId, userId);

    expect(result.subject_name).toBe('Matemáticas');
    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].topics).toEqual([
      expect.objectContaining({
        id: 'topic-a',
        title: 'Ecuaciones de primer grado',
        covered: true,
        document_name: 'libro.pdf',
      }),
      expect.objectContaining({
        id: 'topic-b',
        covered: false,
        document_name: null,
      }),
    ]);
  });

  it('should report covered and total counts for the progress summary', async () => {
    const result = await service.getCoverage(institutionId, subjectId, userId);

    expect(result.covered_count).toBe(1);
    expect(result.total_count).toBe(2);
  });

  it('should anchor each probe with the topic title and description', async () => {
    await service.getCoverage(institutionId, subjectId, userId);

    expect(ragServiceMock.probeTopicCoverage).toHaveBeenCalledWith(
      expect.objectContaining({
        institutionId,
        subjectId,
        topics: [
          {
            topicId: 'topic-a',
            text: 'Ecuaciones de primer grado\nDespejar la incógnita',
          },
          // Tópico sem ementa cai para o título apenas
          { topicId: 'topic-b', text: 'Inecuaciones' },
        ],
      }),
    );
  });

  it('should throw NotFoundException when the subject does not belong to the tenant', async () => {
    prismaMock.subject.findFirst.mockResolvedValue(null);

    await expect(
      service.getCoverage(institutionId, subjectId, userId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should scope the subject lookup by the institution of the JWT', async () => {
    await service.getCoverage(institutionId, subjectId, userId);

    const where = prismaMock.subject.findFirst.mock.calls[0][0]?.where as any;
    expect(where.id).toBe(subjectId);
    expect(where.course.institution_id).toBe(institutionId);
  });

  it('should block the probe when the token limit is reached', async () => {
    aiUsageServiceMock.hasAvailableTokens.mockResolvedValue(false);

    await expect(
      service.getCoverage(institutionId, subjectId, userId),
    ).rejects.toThrow(ForbiddenException);
    expect(ragServiceMock.probeTopicCoverage).not.toHaveBeenCalled();
  });

  // §11/§12: nenhuma chamada à IA pode ficar sem registro em AI_Usage
  it('should register AI_Usage after probing', async () => {
    await service.getCoverage(institutionId, subjectId, userId);

    expect(aiUsageServiceMock.register).toHaveBeenCalledWith(
      expect.objectContaining({
        institution_id: institutionId,
        user_id: userId,
        prompt_tokens: 42,
        response_tokens: 0,
        // O modelo registrado é o de EMBEDDING (o que rodou), não o de texto
        model: 'gemini-embedding-001',
      }),
    );
  });

  it('should not call the AI or register usage for a subject with no topics', async () => {
    prismaMock.subject.findFirst.mockResolvedValue({
      ...mockSubject,
      modules: [],
    } as any);

    const result = await service.getCoverage(institutionId, subjectId, userId);

    expect(result.total_count).toBe(0);
    expect(ragServiceMock.probeTopicCoverage).not.toHaveBeenCalled();
    expect(aiUsageServiceMock.register).not.toHaveBeenCalled();
  });
});
