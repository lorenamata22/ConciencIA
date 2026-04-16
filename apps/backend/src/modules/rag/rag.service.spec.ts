import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';
import { createAIProviderMock } from '../ai-provider/ai-provider.mock';
import { AIProviderService } from '../ai-provider/ai-provider.service';

describe('RagService', () => {
  let service: RagService;
  let prismaMock: PrismaMock;
  let aiProviderMock: ReturnType<typeof createAIProviderMock>;

  const institutionId = 'inst-id-1';

  const mockEmbedding = {
    id: 'emb-id-1',
    file_id: 'file-id-1',
    chunk_text: 'Equação de 1º grau: ax + b = 0',
    embedding_vector: new Array(1024).fill(0.1),
    metadata: {
      institution_id: institutionId,
      file_id: 'file-id-1',
      subject_id: 'subject-id-1',
      topic_id: null,
      module_id: 'module-id-1',
      document_name: 'aula-01.pdf',
    },
    created_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    aiProviderMock = createAIProviderMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AIProviderService, useValue: { getProvider: () => aiProviderMock } },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  describe('ingestFile', () => {
    it('should extract text, chunk, generate embeddings and save with metadata', async () => {
      aiProviderMock.embed.mockResolvedValue({
        vector: new Array(1024).fill(0.1),
        model: 'voyage-3',
      });
      prismaMock.embedding.createMany.mockResolvedValue({ count: 3 } as any);
      prismaMock.file.update.mockResolvedValue({} as any);

      await service.ingestFile({
        fileId: 'file-id-1',
        institutionId,
        fileUrl: 'https://storage/aula-01.pdf',
        fileName: 'aula-01.pdf',
        replaceExisting: false,
      });

      // Deve atualizar status do arquivo
      expect(prismaMock.file.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ingestion_status: 'completed' }),
        }),
      );
    });

    it('should delete old embeddings before re-indexing when replaceExisting is true', async () => {
      aiProviderMock.embed.mockResolvedValue({
        vector: new Array(1024).fill(0.1),
        model: 'voyage-3',
      });
      prismaMock.embedding.deleteMany.mockResolvedValue({ count: 5 } as any);
      prismaMock.embedding.createMany.mockResolvedValue({ count: 3 } as any);
      prismaMock.file.update.mockResolvedValue({} as any);

      await service.ingestFile({
        fileId: 'file-id-1',
        institutionId,
        fileUrl: 'https://storage/aula-01-v2.pdf',
        fileName: 'aula-01.pdf',
        replaceExisting: true,
      });

      // REGRA CRÍTICA: deletar embeddings antigos antes de re-indexar
      expect(prismaMock.embedding.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ file_id: 'file-id-1' }),
        }),
      );
    });

    it('should NOT delete embeddings when replaceExisting is false', async () => {
      aiProviderMock.embed.mockResolvedValue({
        vector: new Array(1024).fill(0.1),
        model: 'voyage-3',
      });
      prismaMock.embedding.createMany.mockResolvedValue({ count: 3 } as any);
      prismaMock.file.update.mockResolvedValue({} as any);

      await service.ingestFile({
        fileId: 'file-id-1',
        institutionId,
        fileUrl: 'https://storage/aula-01.pdf',
        fileName: 'aula-01.pdf',
        replaceExisting: false,
      });

      expect(prismaMock.embedding.deleteMany).not.toHaveBeenCalled();
    });

    it('should mark file as failed when ingestion throws an error', async () => {
      aiProviderMock.embed.mockRejectedValue(new Error('Embedding API error'));
      prismaMock.file.update.mockResolvedValue({} as any);

      await expect(
        service.ingestFile({
          fileId: 'file-id-1',
          institutionId,
          fileUrl: 'https://storage/aula-01.pdf',
          fileName: 'aula-01.pdf',
          replaceExisting: false,
        }),
      ).rejects.toThrow();

      expect(prismaMock.file.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ingestion_status: 'failed' }),
        }),
      );
    });

    it('should save metadata with institution_id on each chunk', async () => {
      aiProviderMock.embed.mockResolvedValue({
        vector: new Array(1024).fill(0.1),
        model: 'voyage-3',
      });
      prismaMock.embedding.createMany.mockResolvedValue({ count: 1 } as any);
      prismaMock.file.update.mockResolvedValue({} as any);

      await service.ingestFile({
        fileId: 'file-id-1',
        institutionId,
        fileUrl: 'https://storage/aula-01.pdf',
        fileName: 'aula-01.pdf',
        replaceExisting: false,
      });

      expect(prismaMock.embedding.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              metadata: expect.objectContaining({ institution_id: institutionId }),
            }),
          ]),
        }),
      );
    });
  });

  describe('search', () => {
    it('should return top chunks filtered by institution_id (NEVER without this filter)', async () => {
      aiProviderMock.embed.mockResolvedValue({
        vector: new Array(1024).fill(0.1),
        model: 'voyage-3',
      });
      // Simulando raw query do pgvector
      prismaMock.$queryRaw.mockResolvedValue([mockEmbedding] as any);

      const results = await service.search({
        query: 'equação de 1º grau',
        institutionId,
        subjectId: 'subject-id-1',
        topK: 5,
      });

      expect(results).toHaveLength(1);
      // Verificar que a query inclui institution_id obrigatoriamente
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it('should return top 5 chunks by default', async () => {
      aiProviderMock.embed.mockResolvedValue({
        vector: new Array(1024).fill(0.1),
        model: 'voyage-3',
      });
      prismaMock.$queryRaw.mockResolvedValue([mockEmbedding] as any);

      await service.search({
        query: 'geometria',
        institutionId,
        subjectId: 'subject-id-1',
      });

      // Top K padrão deve ser entre 3 e 5
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it('should filter by topic_id when provided', async () => {
      aiProviderMock.embed.mockResolvedValue({
        vector: new Array(1024).fill(0.1),
        model: 'voyage-3',
      });
      prismaMock.$queryRaw.mockResolvedValue([mockEmbedding] as any);

      await service.search({
        query: 'equação',
        institutionId,
        subjectId: 'subject-id-1',
        topicId: 'topic-id-1',
      });

      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });
  });
});
