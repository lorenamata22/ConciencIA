import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AIProviderService } from '../src/modules/ai-provider/ai-provider.service';
import { RagService } from '../src/modules/rag/rag.service';
import { PrismaService } from '../src/prisma/prisma.service';

const examContent = {
  questions: [
    ...['q1', 'q2', 'q3'].map((id) => ({
      id,
      type: 'multiple_choice',
      concept_label: 'Concepto',
      statement: `Pregunta ${id}`,
      options: [
        { id: 'a', text: `A ${id}` },
        { id: 'b', text: `B ${id}` },
        { id: 'c', text: `C ${id}` },
        { id: 'd', text: `D ${id}` },
      ],
      correct_option_id: 'b',
      rationale: `Razón ${id}`,
      source_reference: '[1]',
    })),
    ...['q4', 'q5'].map((id) => ({
      id,
      type: 'essay',
      concept_label: 'Concepto',
      statement: `Desarrollo ${id}`,
      hint: 'Pista',
      key_points: ['Punto 1', 'Punto 2'],
      source_reference: '[1]',
    })),
  ],
};

describe('Topic completion through main exam (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let institutionId: string;
  let subjectId: string;
  let topicId: string;
  let studentId: string;
  let accessToken: string;

  const completeStructured = jest.fn().mockImplementation((options) => {
    const isGeneration = options.messages[0].content.startsWith('Genera');
    return Promise.resolve({
      data: isGeneration
        ? examContent
        : {
            results: examContent.questions.map((question) => ({
              question_id: question.id,
              verdict: 'correct',
              feedback: 'Buen trabajo.',
            })),
          },
      promptTokens: 10,
      responseTokens: 20,
    });
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AIProviderService)
      .useValue({
        completeStructured,
        getProvider: () => ({
          getProviderName: () => 'mock',
          getModelName: () => 'mock-model',
        }),
      })
      .overrideProvider(RagService)
      .useValue({
        search: jest.fn().mockResolvedValue({
          chunks: [
            {
              id: 'chunk-1',
              chunk_text: 'Material suficiente para generar el examen.',
              metadata: {},
              distance: 0.1,
            },
          ],
          hasSufficientContext: true,
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = moduleFixture.get(PrismaService);

    const institution = await prisma.institution.create({
      data: { name: 'Institution Topic Completion', ai_token_limit: 100000 },
    });
    institutionId = institution.id;
    const course = await prisma.course.create({
      data: { institution_id: institutionId, name: 'Course Topic Completion' },
    });
    const subject = await prisma.subject.create({
      data: { course_id: course.id, name: 'Subject Topic Completion' },
    });
    subjectId = subject.id;
    const courseModule = await prisma.module.create({
      data: {
        subject_id: subjectId,
        name: 'Module Topic Completion',
        order: 1,
      },
    });
    const topic = await prisma.topic.create({
      data: {
        module_id: courseModule.id,
        title: 'Topic Completion',
        description: 'Description',
        order: 1,
      },
    });
    topicId = topic.id;
    await prisma.class.create({
      data: {
        course_id: course.id,
        name: 'Class Topic Completion',
        year: 2026,
        period: '1',
        license_code: 'TOPIC-COMPLETION-E2E',
      },
    });

    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        licenseCode: 'TOPIC-COMPLETION-E2E',
        name: 'Student Topic Completion',
        email: 'topic-completion@e2e.test',
        birthDate: '2000-01-01',
        password: 'SecurePassword123',
      })
      .expect(201);
    accessToken = register.body.data.accessToken;
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'topic-completion@e2e.test' },
      include: { student: true },
    });
    studentId = user.student!.id;
  });

  afterAll(async () => {
    await prisma.topicProgress.deleteMany({ where: { student_id: studentId } });
    await prisma.studentMetrics.deleteMany({
      where: { student_id: studentId },
    });
    await prisma.aIUsage.deleteMany({
      where: { institution_id: institutionId },
    });
    await prisma.exam.deleteMany({ where: { student_id: studentId } });
    await prisma.studentClass.deleteMany({ where: { student_id: studentId } });
    await prisma.student.delete({ where: { id: studentId } });
    await prisma.user.deleteMany({ where: { institution_id: institutionId } });
    await prisma.class.deleteMany({
      where: { course: { institution_id: institutionId } },
    });
    await prisma.topic.delete({ where: { id: topicId } });
    await prisma.module.deleteMany({ where: { subject_id: subjectId } });
    await prisma.subject.delete({ where: { id: subjectId } });
    await prisma.course.deleteMany({
      where: { institution_id: institutionId },
    });
    await prisma.institution.delete({ where: { id: institutionId } });
    await app.close();
  });

  it('should mark the topic completed only after submitting a main exam', async () => {
    const generated = await request(app.getHttpServer())
      .post('/exams')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ topic_id: topicId, type: 'main' })
      .expect(201);

    expect(
      await prisma.topicProgress.findUnique({
        where: {
          student_id_topic_id: { student_id: studentId, topic_id: topicId },
        },
      }),
    ).toBeNull();

    await request(app.getHttpServer())
      .post(`/exams/${generated.body.data.exam_id}/answers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        answers: [
          { question_id: 'q1', selected_option_id: 'b' },
          { question_id: 'q2', selected_option_id: 'b' },
          { question_id: 'q3', selected_option_id: 'b' },
          { question_id: 'q4', essay_text: 'Respuesta cuatro' },
          { question_id: 'q5', essay_text: 'Respuesta cinco' },
        ],
      })
      .expect(201);

    const progress = await prisma.topicProgress.findUnique({
      where: {
        student_id_topic_id: { student_id: studentId, topic_id: topicId },
      },
    });
    expect(progress?.status).toBe('completed');
  });
});
