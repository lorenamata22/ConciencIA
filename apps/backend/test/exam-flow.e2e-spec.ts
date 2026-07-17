import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AIProviderService } from '../src/modules/ai-provider/ai-provider.service';
import { RagService } from '../src/modules/rag/rag.service';
import { PrismaService } from '../src/prisma/prisma.service';

const multipleChoice = (id: string) => ({
  id,
  type: 'multiple_choice',
  concept_label: `Concept ${id}`,
  statement: `Question ${id}`,
  options: [
    { id: 'a', text: `A ${id}` },
    { id: 'b', text: `B ${id}` },
    { id: 'c', text: `C ${id}` },
    { id: 'd', text: `D ${id}` },
  ],
  correct_option_id: 'b',
  rationale: `Rationale ${id}`,
  source_reference: '[1]',
});

const essay = (id: string) => ({
  id,
  type: 'essay',
  concept_label: `Concept ${id}`,
  statement: `Essay ${id}`,
  hint: `Hint ${id}`,
  key_points: ['First point', 'Second point'],
  source_reference: '[1]',
});

const mainContent = {
  questions: [
    multipleChoice('q1'),
    multipleChoice('q2'),
    multipleChoice('q3'),
    essay('q4'),
    essay('q5'),
  ],
};

const retryContent = {
  questions: [multipleChoice('r1'), essay('r2')],
};

describe('Structured exam flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let institutionId: string;
  let subjectId: string;
  let topicId: string;
  let studentId: string;
  let accessToken: string;
  let mainExamId: string;
  let retryExamId: string;
  let accuracyAfterMain: number;

  const completeStructured = jest.fn().mockImplementation((options) => {
    const userContent = options.messages[0].content as string;
    const isGeneration = userContent.startsWith('Genera');
    const isRetry =
      (options.system as string).includes(
        '# Modo práctica de puntos débiles',
      ) || userContent.includes('question_id: r1');

    if (isGeneration) {
      return Promise.resolve({
        data: isRetry ? retryContent : mainContent,
        promptTokens: 30,
        responseTokens: 60,
      });
    }

    const questionIds = isRetry
      ? retryContent.questions.map((question) => question.id)
      : mainContent.questions.map((question) => question.id);
    return Promise.resolve({
      data: {
        results: questionIds.map((questionId) => ({
          question_id: questionId,
          verdict:
            questionId === 'q5'
              ? 'incorrect'
              : questionId === 'q4'
                ? 'Correct'
                : 'correct',
          feedback: `Feedback ${questionId}`,
        })),
      },
      promptTokens: 20,
      responseTokens: 40,
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
              chunk_text: 'Teacher material for the selected topic.',
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
      data: { name: 'Institution Exam Flow', ai_token_limit: 100000 },
    });
    institutionId = institution.id;
    const course = await prisma.course.create({
      data: { institution_id: institutionId, name: 'Course Exam Flow' },
    });
    const subject = await prisma.subject.create({
      data: { course_id: course.id, name: 'Subject Exam Flow' },
    });
    subjectId = subject.id;
    const courseModule = await prisma.module.create({
      data: { subject_id: subjectId, name: 'Module Exam Flow', order: 1 },
    });
    const topic = await prisma.topic.create({
      data: {
        module_id: courseModule.id,
        title: 'Topic Exam Flow',
        description: 'Topic description',
        order: 1,
      },
    });
    topicId = topic.id;
    await prisma.class.create({
      data: {
        course_id: course.id,
        name: 'Class Exam Flow',
        year: 2026,
        period: '1',
        license_code: 'EXAM-FLOW-E2E',
      },
    });

    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        licenseCode: 'EXAM-FLOW-E2E',
        name: 'Student Exam Flow',
        email: 'exam-flow@e2e.test',
        birthDate: '2000-01-01',
        password: 'SecurePassword123',
      })
      .expect(201);
    accessToken = register.body.data.accessToken;
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'exam-flow@e2e.test' },
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

  it('should generate and submit a main exam without leaking the answer key', async () => {
    const generated = await request(app.getHttpServer())
      .post('/exams')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ topic_id: topicId, type: 'main' })
      .expect(201);

    mainExamId = generated.body.data.exam_id;
    expect(generated.body.data.questions).toHaveLength(5);
    expect(JSON.stringify(generated.body.data)).not.toContain(
      'correct_option_id',
    );
    expect(JSON.stringify(generated.body.data)).not.toContain('key_points');

    const submitted = await request(app.getHttpServer())
      .post(`/exams/${mainExamId}/answers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        answers: [
          { question_id: 'q1', selected_option_id: 'b' },
          { question_id: 'q2', selected_option_id: 'b' },
          { question_id: 'q3', selected_option_id: 'a' },
          { question_id: 'q4', essay_text: 'Answer four' },
          { question_id: 'q5', essay_text: 'Answer five' },
        ],
      })
      .expect(201);

    expect(submitted.body.data.final_score).toBe(3);
    expect(submitted.body.data.result_summary).toContain('Student Exam Flow');
    expect(JSON.stringify(submitted.body.data)).not.toContain('rationale');

    const progress = await prisma.topicProgress.findUnique({
      where: {
        student_id_topic_id: { student_id: studentId, topic_id: topicId },
      },
    });
    expect(progress?.status).toBe('completed');
    const metrics = await prisma.studentMetrics.findUniqueOrThrow({
      where: {
        student_id_subject_id: { student_id: studentId, subject_id: subjectId },
      },
    });
    expect(metrics.attempts).toBe(1);
    expect(metrics.accuracy_rate).toBeCloseTo(0.6);
    accuracyAfterMain = metrics.accuracy_rate;
  });

  it('should return the persisted result without another AI call', async () => {
    const callsBeforeGet = completeStructured.mock.calls.length;
    const response = await request(app.getHttpServer())
      .get(`/exams/${mainExamId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data.final_score).toBe(3);
    expect(completeStructured).toHaveBeenCalledTimes(callsBeforeGet);
  });

  it('should complete a retry without changing accuracy or topic completion', async () => {
    const generated = await request(app.getHttpServer())
      .post('/exams')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        topic_id: topicId,
        type: 'retry',
        source_exam_id: mainExamId,
      })
      .expect(201);
    retryExamId = generated.body.data.exam_id;
    expect(generated.body.data.questions).toHaveLength(2);
    expect(
      generated.body.data.questions.map((question) => question.id),
    ).toEqual(['r1', 'r2']);

    await request(app.getHttpServer())
      .post(`/exams/${retryExamId}/answers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        answers: [
          { question_id: 'r1', selected_option_id: 'b' },
          { question_id: 'r2', essay_text: 'Retry answer' },
        ],
      })
      .expect(201);

    const metrics = await prisma.studentMetrics.findUniqueOrThrow({
      where: {
        student_id_subject_id: { student_id: studentId, subject_id: subjectId },
      },
    });
    expect(metrics.attempts).toBe(2);
    expect(metrics.accuracy_rate).toBe(accuracyAfterMain);
    expect(
      await prisma.topicProgress.count({
        where: {
          student_id: studentId,
          topic_id: topicId,
          status: 'completed',
        },
      }),
    ).toBe(1);
  });
});
