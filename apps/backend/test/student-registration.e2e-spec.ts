import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E: Fluxo de cadastro do aluno com license_code
 * Cobre a regra inegociável: aluno só se cadastra com license_code válido
 */
describe('Student Registration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Limpar dados de teste para evitar conflito entre cenários
    await prisma.studentClass.deleteMany({ where: {} });
    await prisma.student.deleteMany({ where: {} });
    await prisma.user.deleteMany({ where: { email: { contains: '@test-e2e.com' } } });
  });

  let institutionId: string;
  let classId: string;
  let licenseCode: string;

  beforeAll(async () => {
    // Criar dados de suporte para os testes
    const institution = await prisma.institution.create({
      data: { name: 'Escola E2E Test', ai_token_limit: 1000000 },
    });
    institutionId = institution.id;

    const course = await prisma.course.create({
      data: { institution_id: institutionId, name: 'Ensino Médio E2E' },
    });

    const classRecord = await prisma.class.create({
      data: {
        course_id: course.id,
        name: 'Turma E2E',
        year: 2026,
        period: '1',
        license_code: 'E2ETEST001',
      },
    });
    classId = classRecord.id;
    licenseCode = 'E2ETEST001';
  });

  afterAll(async () => {
    await prisma.class.deleteMany({ where: { id: classId } });
    await prisma.course.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.deleteMany({ where: { id: institutionId } });
  });

  it('should register student successfully with valid license_code', async () => {
    const response = await request(app.getHttpServer())
      .post('/students/register')
      .send({
        name: 'Aluno E2E',
        email: 'aluno@test-e2e.com',
        password: 'SenhaSegura123',
        license_code: licenseCode,
        is_minor: false,
      })
      .expect(201);

    expect(response.body.data).toBeDefined();
    expect(response.body.statusCode).toBe(201);
    expect(response.body.data.email).toBe('aluno@test-e2e.com');
  });

  it('should automatically link student to correct institution (never from client input)', async () => {
    const response = await request(app.getHttpServer())
      .post('/students/register')
      .send({
        name: 'Aluno Vinculo',
        email: 'vinculo@test-e2e.com',
        password: 'SenhaSegura123',
        license_code: licenseCode,
        is_minor: false,
      })
      .expect(201);

    // Verificar que o aluno foi vinculado à instituição correta
    const user = await prisma.user.findUnique({
      where: { email: 'vinculo@test-e2e.com' },
    });

    expect(user?.institution_id).toBe(institutionId);
  });

  it('should automatically link student to the class of the license_code', async () => {
    const response = await request(app.getHttpServer())
      .post('/students/register')
      .send({
        name: 'Aluno Turma',
        email: 'turma@test-e2e.com',
        password: 'SenhaSegura123',
        license_code: licenseCode,
        is_minor: false,
      })
      .expect(201);

    const user = await prisma.user.findUnique({
      where: { email: 'turma@test-e2e.com' },
      include: { student: { include: { studentClasses: true } } },
    });

    const studentClass = user?.student?.studentClasses[0];
    expect(studentClass?.class_id).toBe(classId);
  });

  it('should return 400 when license_code is invalid', async () => {
    const response = await request(app.getHttpServer())
      .post('/students/register')
      .send({
        name: 'Aluno Inválido',
        email: 'invalido@test-e2e.com',
        password: 'SenhaSegura123',
        license_code: 'CODIGO-INEXISTENTE',
        is_minor: false,
      })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
  });

  it('should follow standard API response format { data, message, statusCode }', async () => {
    const response = await request(app.getHttpServer())
      .post('/students/register')
      .send({
        name: 'Formato E2E',
        email: 'formato@test-e2e.com',
        password: 'SenhaSegura123',
        license_code: licenseCode,
        is_minor: false,
      })
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('statusCode');
  });

  it('should hash password before saving (never store plain text)', async () => {
    await request(app.getHttpServer())
      .post('/students/register')
      .send({
        name: 'Aluno Hash',
        email: 'hash@test-e2e.com',
        password: 'SenhaSegura123',
        license_code: licenseCode,
        is_minor: false,
      })
      .expect(201);

    const user = await prisma.user.findUnique({ where: { email: 'hash@test-e2e.com' } });
    expect(user?.password).not.toBe('SenhaSegura123');
    expect(user?.password.length).toBeGreaterThan(20); // bcrypt hash
  });
});
