import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AIProviderService } from '../src/modules/ai-provider/ai-provider.service';
import { RagService } from '../src/modules/rag/rag.service';

/**
 * E2E: Conclusão do tópico (Topic Completion)
 * Regra inegociável: tópico só é marcado como 'completed' após [EXAM_COMPLETE]
 * Cobre também: não completar antes, student_metrics atualizado, exam salvo
 */
describe('Topic Completion Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let institutionId: string;
  let studentToken: string;
  let studentId: string;
  let subjectId: string;
  let topicId: string;

  const createAiMock = (shouldComplete = false) => ({
    getProvider: () => ({
      stream: jest.fn().mockImplementation(async function* () {
        if (shouldComplete) {
          yield 'Parabéns por completar o exame! Pontuação: 9/10. [EXAM_COMPLETE]';
        } else {
          yield 'Boa tentativa! Vamos para a próxima questão.';
        }
      }),
      complete: jest.fn(),
      embed: jest.fn(),
      getProviderName: jest.fn().mockReturnValue('mock'),
    }),
  });

  let aiProviderMock = createAiMock(false);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AIProviderService)
      .useValue(aiProviderMock)
      .overrideProvider(RagService)
      .useValue({
        search: jest.fn().mockResolvedValue([]),
        ingestFile: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const institution = await prisma.institution.create({
      data: { name: 'Escola Topic E2E', ai_token_limit: 1000000 },
    });
    institutionId = institution.id;

    const course = await prisma.course.create({
      data: { institution_id: institutionId, name: 'Curso Topic E2E' },
    });

    const subject = await prisma.subject.create({
      data: { course_id: course.id, name: 'Matéria Topic E2E' },
    });
    subjectId = subject.id;

    const courseModule = await prisma.module.create({
      data: { subject_id: subjectId, name: 'Módulo Topic E2E', order: 1 },
    });

    const topic = await prisma.topic.create({
      data: {
        module_id: courseModule.id,
        title: 'Tópico Completion E2E',
        description: 'Tópico para teste de conclusão',
        order: 1,
      },
    });
    topicId = topic.id;

    const classRecord = await prisma.class.create({
      data: {
        course_id: course.id,
        name: 'Turma Topic E2E',
        year: 2026,
        period: '1',
        license_code: 'TOPIC001',
      },
    });

    const registerResponse = await request(app.getHttpServer())
      .post('/students/register')
      .send({
        name: 'Aluno Topic E2E',
        email: 'topic@test-e2e.com',
        password: 'SenhaSegura123',
        license_code: 'TOPIC001',
        is_minor: false,
      });

    studentId = registerResponse.body.data?.studentId;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'topic@test-e2e.com', password: 'SenhaSegura123' });

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
    await prisma.user.deleteMany({ where: { institution_id: institutionId } });
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.module.deleteMany({ where: { subject_id: subjectId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.class.deleteMany({ where: { license_code: 'TOPIC001' } });
    await prisma.course.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.deleteMany({ where: { id: institutionId } });
    await app.close();
  });

  it('should NOT mark topic as completed before exam starts', async () => {
    const progress = await prisma.topicProgress.findFirst({
      where: { student_id: studentId, topic_id: topicId },
    });

    // Nenhum progresso deve existir antes do exame
    expect(progress).toBeNull();
  });

  it('should set topic status to in_progress when exam begins', async () => {
    const convResponse = await request(app.getHttpServer())
      .post('/conversations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ subject_id: subjectId, topic_id: topicId, mode: 'exam' })
      .expect(201);

    const conversationId = convResponse.body.data?.id;

    // IA NÃO emite [EXAM_COMPLETE] ainda
    await request(app.getHttpServer())
      .post('/chat/exam')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        conversation_id: conversationId,
        content: 'Iniciar exame',
      });

    const progress = await prisma.topicProgress.findFirst({
      where: { student_id: studentId, topic_id: topicId },
    });

    // Deve estar in_progress, não completed
    expect(progress?.status).toBe('in_progress');
  });

  it('should mark topic as completed ONLY after [EXAM_COMPLETE] tag is detected', async () => {
    // Criar nova conversa de exame
    const convResponse = await request(app.getHttpServer())
      .post('/conversations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ subject_id: subjectId, topic_id: topicId, mode: 'exam' })
      .expect(201);

    const conversationId = convResponse.body.data?.id;

    // Mudar mock para emitir [EXAM_COMPLETE]
    const completingMock = createAiMock(true);
    // Atualizar o provider mock em runtime
    aiProviderMock.getProvider = completingMock.getProvider;

    await request(app.getHttpServer())
      .post('/chat/exam')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        conversation_id: conversationId,
        content: 'Resposta final do exame',
      });

    const progress = await prisma.topicProgress.findFirst({
      where: { student_id: studentId, topic_id: topicId },
      orderBy: { updated_at: 'desc' },
    });

    expect(progress?.status).toBe('completed');
  });

  it('should save exam record with score and summary after completion', async () => {
    const exam = await prisma.exam.findFirst({
      where: { student_id: studentId, subject_id: subjectId },
      orderBy: { completed_at: 'desc' },
    });

    expect(exam).toBeDefined();
    expect(exam?.completed_at).toBeDefined();
    expect(exam?.final_score).toBeDefined();
  });

  it('should update StudentMetrics for the subject after exam completion', async () => {
    const metrics = await prisma.studentMetrics.findFirst({
      where: { student_id: studentId, subject_id: subjectId },
    });

    expect(metrics).toBeDefined();
    expect(metrics?.attempts).toBeGreaterThan(0);
    expect(metrics?.accuracy_rate).toBeGreaterThan(0);
  });

  it('should not allow teacher role to access chat (role guard)', async () => {
    // Criar professor e obter token
    const teacherUser = await prisma.user.create({
      data: {
        institution_id: institutionId,
        name: 'Professor Topic E2E',
        email: 'professor-topic@test-e2e.com',
        password: '$2a$10$hashedpassword',
        user_type: 'teacher',
      },
    });
    await prisma.teacher.create({ data: { user_id: teacherUser.id } });

    const teacherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'professor-topic@test-e2e.com', password: 'SenhaSegura123' });

    const teacherToken = teacherLogin.body.data?.accessToken;

    await request(app.getHttpServer())
      .post('/chat/exam')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ conversation_id: 'qualquer', content: 'Hack' })
      .expect(403);

    await prisma.teacher.delete({ where: { user_id: teacherUser.id } });
    await prisma.user.delete({ where: { id: teacherUser.id } });
  });
});
