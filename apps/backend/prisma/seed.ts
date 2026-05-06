import 'dotenv/config';
import { PrismaClient, UserType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SEED_PASSWORD = 'Teste@123';

async function main() {
  const hash = await bcrypt.hash(SEED_PASSWORD, 10);

  // Instituição de teste compartilhada por todos os usuários seed
  const institution = await prisma.institution.upsert({
    where: { id: 'seed-institution-id' },
    update: {},
    create: {
      id: 'seed-institution-id',
      name: 'Instituição de Teste',
      status: 'active',
    },
  });

  // super_admin
  await prisma.user.upsert({
    where: { email: 'admin@teste.com' },
    update: {},
    create: {
      institution_id: institution.id,
      name: 'Admin Teste',
      email: 'admin@teste.com',
      password: hash,
      user_type: UserType.super_admin,
    },
  });

  // institution
  await prisma.user.upsert({
    where: { email: 'instituicao@teste.com' },
    update: {},
    create: {
      institution_id: institution.id,
      name: 'Instituição Teste',
      email: 'instituicao@teste.com',
      password: hash,
      user_type: UserType.institution,
    },
  });

  // teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: 'professor@teste.com' },
    update: {},
    create: {
      institution_id: institution.id,
      name: 'Professor Teste',
      email: 'professor@teste.com',
      password: hash,
      user_type: UserType.teacher,
    },
  });

  await prisma.teacher.upsert({
    where: { user_id: teacherUser.id },
    update: {},
    create: { user_id: teacherUser.id },
  });

  // student
  const studentUser = await prisma.user.upsert({
    where: { email: 'aluno@teste.com' },
    update: {},
    create: {
      institution_id: institution.id,
      name: 'Aluno Teste',
      email: 'aluno@teste.com',
      password: hash,
      user_type: UserType.student,
    },
  });

  await prisma.student.upsert({
    where: { user_id: studentUser.id },
    update: {},
    create: { user_id: studentUser.id },
  });

  console.log('\n✅ Seed concluído. Credenciais de teste:\n');
  console.log('  Senha de todos os usuários: ' + SEED_PASSWORD);
  console.log('  ─────────────────────────────────────────');
  console.log('  super_admin  →  admin@teste.com');
  console.log('  institution  →  instituicao@teste.com');
  console.log('  teacher      →  professor@teste.com');
  console.log('  student      →  aluno@teste.com');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
