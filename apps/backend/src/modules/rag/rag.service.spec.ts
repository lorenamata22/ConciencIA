import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import {
  CHUNK_SIZE_CHARS,
  DEFAULT_TOP_K,
  MAX_COSINE_DISTANCE,
} from './rag.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';
import { createAIProviderMock } from '../ai-provider/ai-provider.mock';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { StorageService } from '../storage/storage.service';
import { parseOffice } from 'officeparser';

// Nunca usar o parser real em teste unitário — arquivos reais só no smoke test manual
jest.mock('officeparser', () => ({
  parseOffice: jest.fn(),
}));

const parseOfficeMock = parseOffice as jest.Mock;

// O parseOffice do officeparser retorna um AST; o service usa ast.toText()
const astOf = (text: string) => ({ toText: () => text });

// Extrai o texto SQL e os valores de um Prisma.Sql passado ao $queryRaw/$executeRaw
interface SqlLike {
  strings: string[];
  values: unknown[];
}
const sqlTextOf = (arg: SqlLike): string => arg.strings.join(' ');

describe('RagService', () => {
  let service: RagService;
  let prismaMock: PrismaMock;
  let aiProviderMock: ReturnType<typeof createAIProviderMock>;
  let storageMock: { downloadByUrl: jest.Mock };

  const institutionId = 'inst-id-1';

  const baseJob = {
    fileId: 'file-id-1',
    institutionId,
    subjectId: 'subject-id-1',
    topicId: 'topic-id-1',
    fileUrl: 'https://storage/aula-01.pdf',
    fileName: 'aula-01.pdf',
    replaceExisting: false,
  };

  const mockFileRecord = {
    id: 'file-id-1',
    institution_id: institutionId,
    subject_id: 'subject-id-1',
    topic_id: 'topic-id-1',
    name: 'aula-01.pdf',
    type: 'pdf',
    is_ai_context: true,
    ingestion_status: 'processing',
    topic: { id: 'topic-id-1', module_id: 'module-id-1' },
  };

  // Texto longo o suficiente para gerar mais de um chunk no sliding window
  const longText = 'Equação de 1º grau: ax + b = 0. '.repeat(300);

  const mockChunkRow = {
    id: 'emb-id-1',
    chunk_text: 'Equação de 1º grau: ax + b = 0',
    metadata: {
      institution_id: institutionId,
      file_id: 'file-id-1',
      subject_id: 'subject-id-1',
      topic_id: null,
      module_id: 'module-id-1',
      document_name: 'aula-01.pdf',
    },
    distance: 0.2,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock = createPrismaMock();
    aiProviderMock = createAIProviderMock();
    storageMock = {
      downloadByUrl: jest.fn().mockResolvedValue(Buffer.from('file-bytes')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AIProviderService, useValue: aiProviderMock },
        { provide: StorageService, useValue: storageMock },
      ],
    }).compile();

    service = module.get<RagService>(RagService);

    // Setup padrão do caminho feliz — cada teste sobrescreve o que precisar
    prismaMock.file.findUnique.mockResolvedValue(mockFileRecord as never);
    prismaMock.file.update.mockResolvedValue({} as never);
    prismaMock.$executeRaw.mockResolvedValue(1 as never);
    parseOfficeMock.mockResolvedValue(astOf(longText));
    aiProviderMock.embed.mockImplementation((texts: string[]) =>
      Promise.resolve({
        vectors: texts.map(() => new Array(1024).fill(0.1)),
        model: 'voyage-3',
      }),
    );
  });

  describe('ingestFile', () => {
    it('should download, extract, chunk, embed in a single batch call and mark as completed', async () => {
      await service.ingestFile(baseJob);

      expect(storageMock.downloadByUrl).toHaveBeenCalledWith(baseJob.fileUrl);
      expect(parseOfficeMock).toHaveBeenCalled();

      // Uma ÚNICA chamada de embed com o array inteiro de chunks (lote nativo da Voyage)
      expect(aiProviderMock.embed).toHaveBeenCalledTimes(1);
      const chunks = aiProviderMock.embed.mock.calls[0][0];
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(1);
      // Chunks respeitam o tamanho máximo do sliding window
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(CHUNK_SIZE_CHARS);
      }

      // Inserção via SQL raw (coluna vector é Unsupported no Prisma)
      expect(prismaMock.$executeRaw).toHaveBeenCalled();

      // Transição de status: processing no início, completed no fim
      expect(prismaMock.file.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'file-id-1' },
          data: expect.objectContaining({ ingestion_status: 'processing' }),
        }),
      );
      expect(prismaMock.file.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { id: 'file-id-1' },
          data: expect.objectContaining({ ingestion_status: 'completed' }),
        }),
      );
    });

    it('should insert chunks with all required metadata fields', async () => {
      await service.ingestFile(baseJob);

      // Os metadados obrigatórios de cada chunk viajam nos values do SQL parametrizado
      const insertCalls = prismaMock.$executeRaw.mock.calls;
      const allValues = JSON.stringify(
        insertCalls.map((call) => (call[0] as unknown as SqlLike).values),
      );
      expect(allValues).toContain(institutionId);
      expect(allValues).toContain('subject-id-1');
      expect(allValues).toContain('topic-id-1');
      expect(allValues).toContain('module-id-1');
      expect(allValues).toContain('aula-01.pdf');
    });

    it('should insert the denormalized scope columns (institution/subject/topic/module) from File', async () => {
      await service.ingestFile(baseJob);

      const insertCall = prismaMock.$executeRaw.mock
        .calls[0][0] as unknown as SqlLike;
      const sql = sqlTextOf(insertCall);
      // As colunas de escopo entram no INSERT (não só no metadata JSON)
      expect(sql).toContain('institution_id');
      expect(sql).toContain('subject_id');
      expect(sql).toContain('topic_id');
      expect(sql).toContain('module_id');
      // E os valores viajam parametrizados (a partir de File)
      const values = JSON.stringify(insertCall.values);
      expect(values).toContain(institutionId);
      expect(values).toContain('subject-id-1');
      expect(values).toContain('topic-id-1');
      expect(values).toContain('module-id-1');
    });

    it('should preserve the denormalized columns on re-indexing (replaceExisting)', async () => {
      prismaMock.embedding.deleteMany.mockResolvedValue({ count: 3 } as never);

      await service.ingestFile({ ...baseJob, replaceExisting: true });

      const insertCall = prismaMock.$executeRaw.mock
        .calls[0][0] as unknown as SqlLike;
      const values = JSON.stringify(insertCall.values);
      expect(values).toContain(institutionId);
      expect(values).toContain('subject-id-1');
      expect(values).toContain('topic-id-1');
      expect(values).toContain('module-id-1');
    });

    it('should delete old embeddings before re-indexing when replaceExisting is true', async () => {
      prismaMock.embedding.deleteMany.mockResolvedValue({ count: 5 } as never);

      const callOrder: string[] = [];
      prismaMock.embedding.deleteMany.mockImplementation((() => {
        callOrder.push('deleteMany');
        return Promise.resolve({ count: 5 });
      }) as never);
      prismaMock.$executeRaw.mockImplementation((() => {
        callOrder.push('insert');
        return Promise.resolve(1);
      }) as never);

      await service.ingestFile({ ...baseJob, replaceExisting: true });

      // REGRA CRÍTICA: deletar embeddings antigos antes de inserir os novos
      expect(prismaMock.embedding.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ file_id: 'file-id-1' }),
        }),
      );
      expect(callOrder.indexOf('deleteMany')).toBeLessThan(
        callOrder.indexOf('insert'),
      );
    });

    it('should NOT delete embeddings when replaceExisting is false', async () => {
      await service.ingestFile(baseJob);

      expect(prismaMock.embedding.deleteMany).not.toHaveBeenCalled();
    });

    it('should mark file as failed without throwing when extension is not supported', async () => {
      // .xlsx com is_ai_context=true: fora do pipeline RAG no MVP (sem parsing de planilha)
      await expect(
        service.ingestFile({
          ...baseJob,
          fileUrl: 'https://storage/planilha.xlsx',
          fileName: 'planilha.xlsx',
        }),
      ).resolves.not.toThrow();

      expect(prismaMock.file.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ingestion_status: 'failed',
            ingestion_error: expect.stringContaining('xlsx') as string,
          }),
        }),
      );
      // Falha permanente: não baixa, não extrai, não gera embedding
      expect(storageMock.downloadByUrl).not.toHaveBeenCalled();
      expect(aiProviderMock.embed).not.toHaveBeenCalled();
      expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
    });

    it('should mark file as failed without throwing when extracted text is below the minimum threshold', async () => {
      // Simula PDF escaneado (só imagem): officeparser retorna texto vazio
      parseOfficeMock.mockResolvedValue(astOf(''));

      await expect(service.ingestFile(baseJob)).resolves.not.toThrow();

      expect(prismaMock.file.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ingestion_status: 'failed',
            ingestion_error: expect.stringContaining(
              'no extractable text',
            ) as string,
          }),
        }),
      );
      expect(aiProviderMock.embed).not.toHaveBeenCalled();
      expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
    });

    it('should mark file as failed and rethrow when embedding call fails (transient error, BullMQ retries)', async () => {
      aiProviderMock.embed.mockRejectedValue(new Error('Embedding API error'));

      await expect(service.ingestFile(baseJob)).rejects.toThrow(
        'Embedding API error',
      );

      expect(prismaMock.file.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ingestion_status: 'failed' }),
        }),
      );
    });

    it('should resolve module_id as null when file has no topic', async () => {
      prismaMock.file.findUnique.mockResolvedValue({
        ...mockFileRecord,
        topic_id: null,
        topic: null,
      } as never);

      await service.ingestFile(baseJob);

      expect(prismaMock.$executeRaw).toHaveBeenCalled();
      expect(aiProviderMock.embed).toHaveBeenCalledTimes(1);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      prismaMock.$queryRaw.mockResolvedValue([mockChunkRow] as never);
    });

    it('should embed the query and return chunks with hasSufficientContext=true', async () => {
      const result = await service.search({
        query: 'equação de 1º grau',
        institutionId,
        subjectId: 'subject-id-1',
      });

      expect(aiProviderMock.embed).toHaveBeenCalledWith(['equação de 1º grau']);
      expect(result.chunks).toHaveLength(1);
      expect(result.hasSufficientContext).toBe(true);
    });

    it('should ALWAYS filter by institution_id in the raw query (never without it)', async () => {
      await service.search({
        query: 'equação',
        institutionId,
        subjectId: 'subject-id-1',
      });

      const sqlArg = prismaMock.$queryRaw.mock
        .calls[0][0] as unknown as SqlLike;
      expect(sqlTextOf(sqlArg)).toContain('institution_id');
      expect(sqlArg.values).toContain(institutionId);
    });

    it('should NEVER return a chunk from another institution even if the query returns one', async () => {
      // Defesa em profundidade: mesmo que a query retornasse um chunk de outro
      // tenant (bug, migração de dados), ele deve ser descartado do resultado
      const foreignChunk = {
        ...mockChunkRow,
        id: 'emb-foreign',
        metadata: { ...mockChunkRow.metadata, institution_id: 'outra-inst' },
      };
      prismaMock.$queryRaw.mockResolvedValue([
        mockChunkRow,
        foreignChunk,
      ] as never);

      const result = await service.search({
        query: 'equação',
        institutionId,
        subjectId: 'subject-id-1',
      });

      expect(result.chunks).toHaveLength(1);
      expect(
        result.chunks.every(
          (chunk) => chunk.metadata.institution_id === institutionId,
        ),
      ).toBe(true);
    });

    it('should query the denormalized embedding columns (no JOIN to file)', async () => {
      await service.search({
        query: 'equação',
        institutionId,
        subjectId: 'subject-id-1',
        topicId: 'topic-id-1',
      });

      const sql = sqlTextOf(
        prismaMock.$queryRaw.mock.calls[0][0] as unknown as SqlLike,
      ).toLowerCase();
      expect(sql).toContain('from embedding');
      expect(sql).not.toContain('join file');
      expect(sql).toContain('e.institution_id');
    });

    it('should apply the topic scope rule (topic OR subject-wide with topic_id NULL) when topicId is provided', async () => {
      await service.search({
        query: 'equação',
        institutionId,
        subjectId: 'subject-id-1',
        topicId: 'topic-id-1',
      });

      const sqlArg = prismaMock.$queryRaw.mock
        .calls[0][0] as unknown as SqlLike;
      const sql = sqlTextOf(sqlArg).toLowerCase();
      // Material do tópico OU material da matéria (topic_id NULL)
      expect(sql).toContain('e.topic_id');
      expect(sql).toContain('is null');
      expect(sqlArg.values).toContain('subject-id-1');
      expect(sqlArg.values).toContain('topic-id-1');
    });

    it('should search the whole subject (no topic constraint) when topicId is absent — Exam mode', async () => {
      await service.search({
        query: 'equação',
        institutionId,
        subjectId: 'subject-id-1',
      });

      const sqlArg = prismaMock.$queryRaw.mock
        .calls[0][0] as unknown as SqlLike;
      const sql = sqlTextOf(sqlArg).toLowerCase();
      // Matéria inteira: filtra subject_id e NÃO restringe topic_id
      expect(sql).toContain('e.subject_id');
      expect(sql).not.toContain('is null');
      expect(sqlArg.values).toContain('subject-id-1');
      expect(sqlArg.values).toContain(institutionId);
    });

    it('should use default topK of 5 when not provided', async () => {
      await service.search({
        query: 'geometria',
        institutionId,
        subjectId: 'subject-id-1',
      });

      const sqlArg = prismaMock.$queryRaw.mock
        .calls[0][0] as unknown as SqlLike;
      expect(DEFAULT_TOP_K).toBeGreaterThanOrEqual(3);
      expect(DEFAULT_TOP_K).toBeLessThanOrEqual(5);
      expect(sqlArg.values).toContain(DEFAULT_TOP_K);
    });

    it('should report hasSufficientContext=false when no chunk is relevant enough', async () => {
      // Top-K do pgvector sempre retorna K vizinhos, mesmo irrelevantes —
      // chunks acima da distância máxima não contam como contexto suficiente
      prismaMock.$queryRaw.mockResolvedValue([
        { ...mockChunkRow, distance: MAX_COSINE_DISTANCE + 0.1 },
      ] as never);

      const result = await service.search({
        query: 'assunto sem material',
        institutionId,
        subjectId: 'subject-id-1',
      });

      expect(result.chunks).toHaveLength(0);
      expect(result.hasSufficientContext).toBe(false);
    });

    it('should report hasSufficientContext=false when query returns no rows', async () => {
      prismaMock.$queryRaw.mockResolvedValue([] as never);

      const result = await service.search({
        query: 'qualquer coisa',
        institutionId,
        subjectId: 'subject-id-1',
      });

      expect(result.chunks).toHaveLength(0);
      expect(result.hasSufficientContext).toBe(false);
    });
  });

  // Sonda de cobertura do programa: para cada tópico, existe algum chunk da
  // matéria que casa acima do limiar? Mesmo predicado que o Modo Exame usa
  // para decidir entre gerar a prova e devolver 422.
  describe('probeTopicCoverage', () => {
    const topics = [
      { topicId: 'topic-a', text: 'Ecuaciones de primer grado' },
      { topicId: 'topic-b', text: 'Geometría del espacio' },
    ];

    it('should embed every topic query in a SINGLE batch call', async () => {
      prismaMock.$queryRaw.mockResolvedValue([] as never);

      await service.probeTopicCoverage({
        institutionId,
        subjectId: 'subject-id-1',
        topics,
      });

      // Um lote, não uma chamada por tópico — 50 tópicos não podem virar
      // 50 requisições à API de embeddings
      expect(aiProviderMock.embed).toHaveBeenCalledTimes(1);
      expect(aiProviderMock.embed).toHaveBeenCalledWith([
        'Ecuaciones de primer grado',
        'Geometría del espacio',
      ]);
    });

    it('should mark a topic as covered when a chunk is within the distance threshold', async () => {
      prismaMock.$queryRaw.mockResolvedValue([mockChunkRow] as never);

      const result = await service.probeTopicCoverage({
        institutionId,
        subjectId: 'subject-id-1',
        topics: [topics[0]],
      });

      expect(result.results[0]).toEqual(
        expect.objectContaining({
          topic_id: 'topic-a',
          covered: true,
          document_name: 'aula-01.pdf',
        }),
      );
    });

    it('should mark a topic as NOT covered when the closest chunk is beyond the threshold', async () => {
      prismaMock.$queryRaw.mockResolvedValue([
        { ...mockChunkRow, distance: MAX_COSINE_DISTANCE + 0.01 },
      ] as never);

      const result = await service.probeTopicCoverage({
        institutionId,
        subjectId: 'subject-id-1',
        topics: [topics[0]],
      });

      expect(result.results[0].covered).toBe(false);
      expect(result.results[0].document_name).toBeNull();
    });

    it('should mark a topic as NOT covered when the subject has no chunks at all', async () => {
      prismaMock.$queryRaw.mockResolvedValue([] as never);

      const result = await service.probeTopicCoverage({
        institutionId,
        subjectId: 'subject-id-1',
        topics: [topics[0]],
      });

      expect(result.results[0].covered).toBe(false);
      expect(result.results[0].best_distance).toBeNull();
    });

    it('should ALWAYS filter by institution_id in every probe query', async () => {
      prismaMock.$queryRaw.mockResolvedValue([] as never);

      await service.probeTopicCoverage({
        institutionId,
        subjectId: 'subject-id-1',
        topics,
      });

      // Uma query por tópico, todas com o filtro de tenant
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
      for (const call of prismaMock.$queryRaw.mock.calls) {
        const sqlArg = call[0] as unknown as SqlLike;
        expect(sqlTextOf(sqlArg)).toContain('institution_id');
        expect(sqlArg.values).toContain(institutionId);
      }
    });

    it('should discard a chunk from another institution even if the query returns one', async () => {
      prismaMock.$queryRaw.mockResolvedValue([
        {
          ...mockChunkRow,
          metadata: { ...mockChunkRow.metadata, institution_id: 'outra-inst' },
        },
      ] as never);

      const result = await service.probeTopicCoverage({
        institutionId,
        subjectId: 'subject-id-1',
        topics: [topics[0]],
      });

      expect(result.results[0].covered).toBe(false);
    });

    it('should not call the embeddings API when there are no topics', async () => {
      const result = await service.probeTopicCoverage({
        institutionId,
        subjectId: 'subject-id-1',
        topics: [],
      });

      expect(aiProviderMock.embed).not.toHaveBeenCalled();
      expect(result.results).toEqual([]);
      expect(result.estimatedTokens).toBe(0);
    });

    // O registro em AI_Usage precisa dizer qual modelo rodou de fato. A sonda
    // usa o modelo de EMBEDDING, não o de texto — reportar o de texto dá um
    // relatório de custo errado.
    it('should report the embedding model actually used, not the text model', async () => {
      prismaMock.$queryRaw.mockResolvedValue([] as never);

      const result = await service.probeTopicCoverage({
        institutionId,
        subjectId: 'subject-id-1',
        topics: [topics[0]],
      });

      expect(result.model).toBe('voyage-3');
    });
  });
});
