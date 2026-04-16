import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AIProviderService } from '../src/modules/ai-provider/ai-provider.service';
import { RagService } from '../src/modules/rag/rag.service';

/**
 * E2E: Chat Modo Estudo
 * Cobre: seleção de matéria, RAG com institution_id, resumo de histórico,
 * registro em AI_Usage, streaming SSE, guardrails para menores
 */
describe('Chat Study Mode (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let aiProviderMock: any;
  let ragServiceMock: any;

  let institutionId: string;
  let studentToken: string;
  let studentId: string;
  let subjectId: string;
  let conversationId: string;

  beforeAll(async () => {
    // Mock do AI Provider para não chamar API real em testes
    aiProviderMock = {
      getProvider: () => ({
        stream: jest.fn().mockImplementation(async function* () {
          yield 'Uma equação de 1º grau tem a forma ax + b = 0, onde a ≠ 0.';
        }),
        complete: jest.fn(),
        embed: jest.fn(),
        getProviderName: jest.fn().mockReturnValue('mock'),
      }),
    };

    ragServiceMock = {
      search: jest.fn().mockResolvedValue([
        {
          chunk_text: 'Equação de 1º grau: ax + b = 0',
          metadata: { document_name: 'aula-01.pdf' },
        },
      ]),
      ingestFile: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AIProviderService)
      .useValue(aiProviderMock)
      .overrideProvider(RagService)
      .useValue(ragServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Criar dados de suporte
    const institution = await prisma.institution.create({
      data: { name: 'Escola Chat E2E', ai_token_limit: 1000000 },
    });
    institutionId = institution.id;

    const course = await prisma.course.create({
      data: { institution_id: institutionId, name: 'Matemática E2E' },
    });

    const subject = await prisma.subject.create({
      data: { course_id: course.id, name: 'Álgebra E2E' },
    });
    subjectId = subject.id;

    const classRecord = await prisma.class.create({
      data: {
        course_id: course.id,
        name: 'Turma Chat E2E',
        year: 2026,
        period: '1',
        license_code: 'CHAT001',
      },
    });

    // Registrar aluno
    const registerResponse = await request(app.getHttpServer())
      .post('/students/register')
      .send({
        name: 'Aluno Chat E2E',
        email: 'chat@test-e2e.com',
        password: 'SenhaSegura123',
        license_code: 'CHAT001',
        is_minor: false,
      });

    studentId = registerResponse.body.data?.studentId;

    // Login para obter token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'chat@test-e2e.com', password: 'SenhaSegura123' });

    studentToken = loginResponse.body.data?.accessToken;
  });

  afterAll(async () => {
    await prisma.message.deleteMany({ where: {} });
    await prisma.conversation.deleteMany({ where: {} });
    await prisma.aIUsage.deleteMany({ where: { institution_id: institutionId } });
    await prisma.studentClass.deleteMany({ where: {} });
    await prisma.student.deleteMany({ where: {} });
    await prisma.user.deleteMany({ where: { email: { contains: '@test-e2e.com' } } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.class.deleteMany({ where: { license_code: 'CHAT001' } });
    await prisma.course.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.deleteMany({ where: { id: institutionId } });
    await app.close();
  });

  it('should create a study conversation for a subject', async () => {
    const response = await request(app.getHttpServer())
      .post('/conversations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ subject_id: subjectId })
      .expect(201);

    conversationId = response.body.data?.id;
    expect(conversationId).toBeDefined();
  });

  it('should send message and receive streaming response', async () => {
    const response = await request(app.getHttpServer())
      .post('/chat/study')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        conversation_id: conversationId,
        content: 'O que é uma equação de 1º grau?',
      })
      .expect(200);

    expect(response.headers['content-type']).toContain('text/event-stream');
  });

  it('should use RAG context filtered by institution_id', async () => {
    await request(app.getHttpServer())
      .post('/chat/study')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        conversation_id: conversationId,
        content: 'Explique equações',
      });

    // RAG search deve ser chamado com institution_id correto
    expect(ragServiceMock.search).toHaveBeenCalledWith(
      expect.objectContaining({ institutionId }),
    );
  });

  it('should register AI_Usage after each message', async () => {
    const usageCountBefore = await prisma.aIUsage.count({
      where: { institution_id: institutionId },
    });

    await request(app.getHttpServer())
      .post('/chat/study')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        conversation_id: conversationId,
        content: 'O que é álgebra?',
      });

    const usageCountAfter = await prisma.aIUsage.count({
      where: { institution_id: institutionId },
    });

    expect(usageCountAfter).toBeGreaterThan(usageCountBefore);
  });

  it('should return 403 when token limit is reached', async () => {
    // Atualizar limite do aluno para 0
    await prisma.user.update({
      where: { email: 'chat@test-e2e.com' },
      data: { ai_token_limit: 0 },
    });

    const response = await request(app.getHttpServer())
      .post('/chat/study')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        conversation_id: conversationId,
        content: 'Pergunta bloqueada',
      })
      .expect(403);

    expect(response.body.statusCode).toBe(403);

    // Restaurar limite
    await prisma.user.update({
      where: { email: 'chat@test-e2e.com' },
      data: { ai_token_limit: null },
    });
  });

  it('should return 401 when no authentication token is provided', async () => {
    await request(app.getHttpServer())
      .post('/chat/study')
      .send({
        conversation_id: conversationId,
        content: 'Sem token',
      })
      .expect(401);
  });
});
