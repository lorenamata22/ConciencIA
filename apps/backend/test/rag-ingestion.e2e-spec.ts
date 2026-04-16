import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getQueueToken } from '@nestjs/bullmq';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AIProviderService } from '../src/modules/ai-provider/ai-provider.service';
import { RagService } from '../src/modules/rag/rag.service';

/**
 * E2E: Pipeline de ingestão RAG
 * Cobre: upload → enfileiramento → ingestão assíncrona → chunking → embeddings
 * E também: re-indexação ao substituir arquivo (deletar embeddings antigos)
 */
describe('RAG Ingestion Pipeline (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ragQueueMock: { add: jest.Mock };
  let aiProviderMock: any;

  let institutionId: string;
  let institutionToken: string;
  let subjectId: string;
  let fileId: string;

  beforeAll(async () => {
    ragQueueMock = { add: jest.fn().mockResolvedValue({}) };

    aiProviderMock = {
      getProvider: () => ({
        embed: jest.fn().mockResolvedValue({
          vector: new Array(1024).fill(0.1),
          model: 'voyage-3',
        }),
        complete: jest.fn(),
        stream: jest.fn(),
        getProviderName: jest.fn().mockReturnValue('mock'),
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('rag-ingestion'))
      .useValue(ragQueueMock)
      .overrideProvider(AIProviderService)
      .useValue(aiProviderMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Criar dados de suporte
    const institution = await prisma.institution.create({
      data: { name: 'Escola RAG E2E', ai_token_limit: 1000000 },
    });
    institutionId = institution.id;

    const institutionUser = await prisma.user.create({
      data: {
        institution_id: institutionId,
        name: 'Admin RAG',
        email: 'admin-rag@test-e2e.com',
        password: '$2a$10$hashedpassword',
        user_type: 'institution',
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-rag@test-e2e.com', password: 'SenhaSegura123' });

    institutionToken = loginResponse.body.data?.accessToken;

    const course = await prisma.course.create({
      data: { institution_id: institutionId, name: 'Curso RAG E2E' },
    });

    const subject = await prisma.subject.create({
      data: { course_id: course.id, name: 'Matéria RAG E2E' },
    });
    subjectId = subject.id;
  });

  afterAll(async () => {
    await prisma.embedding.deleteMany({ where: {} });
    await prisma.file.deleteMany({ where: { institution_id: institutionId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.course.deleteMany({ where: { institution_id: institutionId } });
    await prisma.user.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.deleteMany({ where: { id: institutionId } });
    await app.close();
  });

  it('should upload file and return immediately with status pending', async () => {
    const response = await request(app.getHttpServer())
      .post('/files')
      .set('Authorization', `Bearer ${institutionToken}`)
      .send({
        name: 'aula-01.pdf',
        type: 'pdf',
        document_type: 'main',
        url: 'https://storage.test/aula-01.pdf',
        size: 1024000,
        subject_id: subjectId,
        is_ai_context: true,
      })
      .expect(201);

    fileId = response.body.data?.id;
    expect(fileId).toBeDefined();
    expect(response.body.data?.ingestion_status).toBe('pending');
  });

  it('should enqueue rag-ingestion job after uploading is_ai_context file', async () => {
    await request(app.getHttpServer())
      .post('/files')
      .set('Authorization', `Bearer ${institutionToken}`)
      .send({
        name: 'material-extra.pdf',
        type: 'pdf',
        document_type: 'supplementary',
        url: 'https://storage.test/material-extra.pdf',
        size: 512000,
        subject_id: subjectId,
        is_ai_context: true,
      });

    expect(ragQueueMock.add).toHaveBeenCalledWith(
      'rag-ingestion',
      expect.objectContaining({
        institutionId,
        replaceExisting: false,
      }),
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('should NOT enqueue job when is_ai_context is false', async () => {
    ragQueueMock.add.mockClear();

    await request(app.getHttpServer())
      .post('/files')
      .set('Authorization', `Bearer ${institutionToken}`)
      .send({
        name: 'referencia.pdf',
        type: 'pdf',
        document_type: 'supplementary',
        url: 'https://storage.test/referencia.pdf',
        size: 256000,
        subject_id: subjectId,
        is_ai_context: false,
      });

    expect(ragQueueMock.add).not.toHaveBeenCalled();
  });

  it('should reject unsupported file types with 400', async () => {
    await request(app.getHttpServer())
      .post('/files')
      .set('Authorization', `Bearer ${institutionToken}`)
      .send({
        name: 'virus.exe',
        type: 'exe',
        document_type: 'main',
        url: 'https://storage.test/virus.exe',
        size: 1024,
        subject_id: subjectId,
        is_ai_context: false,
      })
      .expect(400);
  });

  it('should enqueue job with replaceExisting=true when replacing is_ai_context file', async () => {
    ragQueueMock.add.mockClear();

    await request(app.getHttpServer())
      .post(`/files/${fileId}/replace`)
      .set('Authorization', `Bearer ${institutionToken}`)
      .send({ url: 'https://storage.test/aula-01-v2.pdf' })
      .expect(200);

    expect(ragQueueMock.add).toHaveBeenCalledWith(
      'rag-ingestion',
      expect.objectContaining({
        fileId,
        replaceExisting: true,
      }),
      expect.anything(),
    );
  });

  describe('Ingestão direta (processador de fila)', () => {
    it('should delete old embeddings before creating new ones when replaceExisting is true', async () => {
      // Criar embeddings antigos simulando arquivo já indexado
      await prisma.embedding.createMany({
        data: [
          {
            file_id: fileId,
            chunk_text: 'Chunk antigo 1',
            embedding_vector: null as any, // vetor será mockado
            metadata: { institution_id: institutionId },
          },
        ],
      });

      const ragService = app.get<RagService>(RagService);
      await ragService.ingestFile({
        fileId,
        institutionId,
        fileUrl: 'https://storage.test/aula-01-v2.pdf',
        fileName: 'aula-01.pdf',
        replaceExisting: true,
      });

      // Embeddings antigos devem ter sido deletados
      const oldEmbeddings = await prisma.embedding.findMany({
        where: { file_id: fileId, chunk_text: 'Chunk antigo 1' },
      });
      expect(oldEmbeddings).toHaveLength(0);
    });

    it('should save chunks with institution_id in metadata', async () => {
      const ragService = app.get<RagService>(RagService);
      await ragService.ingestFile({
        fileId,
        institutionId,
        fileUrl: 'https://storage.test/aula-01.pdf',
        fileName: 'aula-01.pdf',
        replaceExisting: false,
      });

      const embeddings = await prisma.embedding.findMany({
        where: { file_id: fileId },
      });

      embeddings.forEach((emb) => {
        expect((emb.metadata as any).institution_id).toBe(institutionId);
      });
    });

    it('should update file ingestion_status to completed after successful ingest', async () => {
      const file = await prisma.file.findUnique({ where: { id: fileId } });
      expect(file?.ingestion_status).toBe('completed');
    });

    it('should update file ingestion_status to failed when ingest fails', async () => {
      // Criar arquivo de teste separado para simular falha
      const failFile = await prisma.file.create({
        data: {
          institution_id: institutionId,
          name: 'falha.pdf',
          type: 'pdf',
          document_type: 'main',
          url: 'https://storage.test/falha.pdf',
          size: 100,
          is_ai_context: true,
          ingestion_status: 'processing',
        },
      });

      // Forçar falha no embed
      aiProviderMock.getProvider().embed.mockRejectedValueOnce(new Error('API Error'));

      const ragService = app.get<RagService>(RagService);
      await expect(
        ragService.ingestFile({
          fileId: failFile.id,
          institutionId,
          fileUrl: 'https://storage.test/falha.pdf',
          fileName: 'falha.pdf',
          replaceExisting: false,
        }),
      ).rejects.toThrow();

      const updatedFile = await prisma.file.findUnique({ where: { id: failFile.id } });
      expect(updatedFile?.ingestion_status).toBe('failed');

      await prisma.file.delete({ where: { id: failFile.id } });
    });
  });
});
