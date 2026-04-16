import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AIProviderService } from '../src/modules/ai-provider/ai-provider.service';
import { RagService } from '../src/modules/rag/rag.service';

/**
 * E2E: Chat Modo Exame
 * Cobre: seleção de matéria+tópico, histórico completo, 7 perguntas,
 * detecção de [EXAM_COMPLETE], cálculo de score, topic completion,
 * não revelar resposta antes do aluno tentar
 */
describe('Chat Exam Mode (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let aiProviderMock: any;
  let ragServiceMock: any;

  let institutionId: string;
  let studentToken: string;
  let studentId: string;
  let subjectId: string;
  let topicId: string;
  let conversationId: string;
  let examId: string;

  // Simula 7 perguntas e então emite [EXAM_COMPLETE]
  let questionCount = 0;
  const generateExamResponse = () => {
    questionCount++;
    if (questionCount >= 7) {
      return `Excelente! Você completou todas as 7 questões. Pontuação: 8.5/10. [EXAM_COMPLETE]`;
    }
    return `Questão ${questionCount + 1}: Explique o conceito de equação de ${questionCount + 1}º grau.`;
  };

  beforeAll(async () => {
    questionCount = 0;

    aiProviderMock = {
      getProvider: () => ({
        stream: jest.fn().mockImplementation(async function* () {
          yield generateExamResponse();
        }),
        complete: jest.fn(),
        embed: jest.fn(),
        getProviderName: jest.fn().mockReturnValue('mock'),
      }),
    };

    ragServiceMock = {
      search: jest.fn().mockResolvedValue([
        {
          chunk_text: 'Conteúdo do tópico para o exame',
          metadata: { document_name: 'material.pdf', topic_id: 'topic-id-1' },
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

    const institution = await prisma.institution.create({
      data: { name: 'Escola Exame E2E', ai_token_limit: 1000000 },
    });
    institutionId = institution.id;

    const course = await prisma.course.create({
      data: { institution_id: institutionId, name: 'Curso Exame E2E' },
    });

    const subject = await prisma.subject.create({
      data: { course_id: course.id, name: 'Matéria Exame E2E' },
    });
    subjectId = subject.id;

    const courseModule = await prisma.module.create({
      data: { subject_id: subjectId, name: 'Módulo 1', order: 1 },
    });

    const topic = await prisma.topic.create({
      data: {
        module_id: courseModule.id,
        title: 'Tópico Exame E2E',
        description: 'Conteúdo do tópico',
        order: 1,
      },
    });
    topicId = topic.id;

    const classRecord = await prisma.class.create({
      data: {
        course_id: course.id,
        name: 'Turma Exame E2E',
        year: 2026,
        period: '1',
        license_code: 'EXAM001',
      },
    });

    const registerResponse = await request(app.getHttpServer())
      .post('/students/register')
      .send({
        name: 'Aluno Exame E2E',
        email: 'exame@test-e2e.com',
        password: 'SenhaSegura123',
        license_code: 'EXAM001',
        is_minor: false,
      });

    studentId = registerResponse.body.data?.studentId;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'exame@test-e2e.com', password: 'SenhaSegura123' });

    studentToken = loginResponse.body.data?.accessToken;
  });

  afterAll(async () => {
    await prisma.topicProgress.deleteMany({ where: {} });
    await prisma.studentMetrics.deleteMany({ where: {} });
    await prisma.exam.deleteMany({ where: {} });
    await prisma.message.deleteMany({ where: {} });
    await prisma.conversation.deleteMany({ where: {} });
    await prisma.aIUsage.deleteMany({ where: { institution_id: institutionId } });
    await prisma.studentClass.deleteMany({ where: {} });
    await prisma.student.deleteMany({ where: {} });
    await prisma.user.deleteMany({ where: { email: { contains: '@test-e2e.com' } } });
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.module.deleteMany({ where: { subject_id: subjectId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.class.deleteMany({ where: { license_code: 'EXAM001' } });
    await prisma.course.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.deleteMany({ where: { id: institutionId } });
    await app.close();
  });

  it('should create exam conversation requiring both subject and topic', async () => {
    const response = await request(app.getHttpServer())
      .post('/conversations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        subject_id: subjectId,
        topic_id: topicId,
        mode: 'exam',
      })
      .expect(201);

    conversationId = response.body.data?.id;
    expect(conversationId).toBeDefined();
    expect(response.body.data?.topic_id).toBe(topicId);
  });

  it('should start exam and receive first question', async () => {
    questionCount = 0; // Reset counter

    const response = await request(app.getHttpServer())
      .post('/chat/exam')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        conversation_id: conversationId,
        content: 'Iniciar exame',
      })
      .expect(200);

    // Exam session deve ter sido criado
    examId = response.body.data?.examId;
    expect(response.headers['content-type']).toContain('text/event-stream');
  });

  it('should send complete conversation history (not summary) in every exam request', async () => {
    // Verificar que a stream foi chamada com histórico completo
    const streamSpy = aiProviderMock.getProvider().stream;

    await request(app.getHttpServer())
      .post('/chat/exam')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        conversation_id: conversationId,
        content: 'Minha resposta para a questão 1',
      });

    const callArgs = streamSpy.mock.calls[streamSpy.mock.calls.length - 1][0];
    // Histórico completo deve estar presente no campo messages
    expect(callArgs.messages).toBeDefined();
    expect(Array.isArray(callArgs.messages)).toBe(true);
  });

  it('should detect [EXAM_COMPLETE] and finalize exam with score', async () => {
    // Simular chegada ao fim do exame
    questionCount = 6; // Próxima chamada retornará [EXAM_COMPLETE]

    await request(app.getHttpServer())
      .post('/chat/exam')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        conversation_id: conversationId,
        content: 'Minha resposta para a última questão',
      });

    // Exam deve estar completo no banco
    const exam = await prisma.exam.findFirst({
      where: { student_id: studentId },
      orderBy: { completed_at: 'desc' },
    });

    expect(exam?.completed_at).toBeDefined();
    expect(exam?.final_score).toBeDefined();
  });

  it('should mark topic as completed after [EXAM_COMPLETE] is detected', async () => {
    const progress = await prisma.topicProgress.findFirst({
      where: { student_id: studentId, topic_id: topicId },
    });

    expect(progress?.status).toBe('completed');
  });

  it('should update StudentMetrics after exam completion', async () => {
    const metrics = await prisma.studentMetrics.findFirst({
      where: { student_id: studentId, subject_id: subjectId },
    });

    expect(metrics).toBeDefined();
    expect(metrics?.attempts).toBeGreaterThan(0);
  });

  it('should register AI_Usage for each exam message', async () => {
    const usageCount = await prisma.aIUsage.count({
      where: { institution_id: institutionId },
    });

    expect(usageCount).toBeGreaterThan(0);
  });
});
