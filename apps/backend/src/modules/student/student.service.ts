import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { generateAccessCode } from '../../common/utils/access-code';
import { isMinor } from '../../common/utils/age';
import { CreateStudentInstitutionDto } from './dto/create-student-institution.dto';
import { UpdateStudentInstitutionDto } from './dto/update-student-institution.dto';

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ── Auto-registro via license_code ────────────────────────────────────────

  async registerWithLicenseCode(data: {
    name: string;
    email: string;
    password: string;
    license_code: string;
    birth_date: Date;
  }) {
    const classRecord = await this.prisma.class.findFirst({
      where: { license_code: data.license_code },
      include: { course: { select: { institution_id: true } } },
    });

    if (!classRecord) {
      throw new BadRequestException('Código de licença inválido ou expirado.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing)
      throw new ConflictException('Já existe um usuário com este e-mail');

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          institution_id: classRecord.course.institution_id,
          name: data.name,
          email: data.email,
          password: hashedPassword,
          user_type: UserType.student,
          birth_date: data.birth_date,
          is_minor: isMinor(data.birth_date),
        },
      });

      const student = await tx.student.create({ data: { user_id: user.id } });
      await tx.studentClass.create({
        data: { student_id: student.id, class_id: classRecord.id },
      });

      return user;
    });
  }

  async submitCognitiveTest(studentId: string, profile: object) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Estudante não encontrado');

    if (student.test_count >= 3) {
      throw new ForbiddenException(
        'Limite de 3 tentativas de teste cognitivo atingido.',
      );
    }

    return this.prisma.student.update({
      where: { id: studentId },
      data: {
        cognitive_profile: profile,
        cognitive_test_date: new Date(),
        test_count: { increment: 1 },
      },
    });
  }

  async findOne(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Estudante não encontrado');
    return student;
  }

  // ── Gestão pela instituição ───────────────────────────────────────────────

  async createByInstitution(
    dto: CreateStudentInstitutionDto,
    institutionId: string,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing)
      throw new ConflictException('Já existe um usuário com este e-mail');

    const classRecord = await this.prisma.class.findFirst({
      where: { id: dto.classId, course: { institution_id: institutionId } },
    });
    if (!classRecord)
      throw new NotFoundException(
        'Turma não encontrada ou não pertence à instituição',
      );

    // Pré-cadastro: sem senha — o aluno ativa a conta depois com o access_code
    const accessCode = generateAccessCode();

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          institution_id: institutionId,
          name: dto.name,
          email: dto.email,
          phone: dto.phone ?? null,
          access_code: accessCode,
          user_type: UserType.student,
          is_minor: dto.isMinor ?? false,
        },
      });

      const created = await tx.student.create({ data: { user_id: user.id } });
      await tx.studentClass.create({
        data: { student_id: created.id, class_id: dto.classId },
      });

      return {
        studentId: created.id,
        userId: user.id,
        name: user.name,
        email: user.email,
      };
    });

    return { ...student, accessCode };
  }

  async findAllByInstitution(institutionId: string) {
    const students = await this.prisma.student.findMany({
      where: { user: { institution_id: institutionId } },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            is_minor: true,
            access_code: true,
          },
        },
        studentClasses: {
          select: {
            class: {
              select: {
                id: true,
                name: true,
                course: { select: { id: true, name: true } },
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return students.map((s) => ({
      id: s.id,
      userId: s.user.id,
      name: s.user.name,
      email: s.user.email,
      phone: s.user.phone,
      isMinor: s.user.is_minor,
      pendingActivation: s.user.access_code !== null,
      class: s.studentClasses[0]?.class ?? null,
    }));
  }

  async findOneByUserId(userId: string, institutionId: string) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            is_minor: true,
            institution_id: true,
            access_code: true,
          },
        },
        studentClasses: {
          select: {
            class: {
              select: {
                id: true,
                name: true,
                course: { select: { id: true, name: true } },
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!student) throw new NotFoundException('Estudante não encontrado');
    if (student.user.institution_id !== institutionId)
      throw new ForbiddenException('Acesso negado');

    return {
      id: student.id,
      userId: student.user.id,
      name: student.user.name,
      email: student.user.email,
      phone: student.user.phone,
      isMinor: student.user.is_minor,
      accessCode: student.user.access_code,
      pendingActivation: student.user.access_code !== null,
      class: student.studentClasses[0]?.class ?? null,
    };
  }

  async sendAccessEmail(userId: string, institutionId: string) {
    const student = await this.findOneByUserId(userId, institutionId);
    if (!student.accessCode) {
      throw new BadRequestException(
        'Usuário já ativou a conta — não há código de acesso para enviar.',
      );
    }
    await this.emailService.sendAccessInvite(
      student.email,
      student.name,
      student.accessCode,
      'student',
    );
    return { sent: true };
  }

  async regenerateAccessCode(userId: string, institutionId: string) {
    const student = await this.findOneByUserId(userId, institutionId);
    if (!student.pendingActivation) {
      throw new BadRequestException(
        'Usuário já ativou a conta — não é possível regenerar o código.',
      );
    }

    const accessCode = generateAccessCode();
    await this.prisma.user.update({
      where: { id: userId },
      data: { access_code: accessCode },
    });

    return { accessCode };
  }

  async updateByUserId(
    userId: string,
    dto: UpdateStudentInstitutionDto,
    institutionId: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
      include: { user: { select: { id: true, institution_id: true } } },
    });

    if (!student) throw new NotFoundException('Estudante não encontrado');
    if (student.user.institution_id !== institutionId)
      throw new ForbiddenException('Acesso negado');

    if (dto.classId) {
      const classRecord = await this.prisma.class.findFirst({
        where: { id: dto.classId, course: { institution_id: institutionId } },
      });
      if (!classRecord)
        throw new NotFoundException(
          'Turma não encontrada ou não pertence à instituição',
        );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.isMinor !== undefined && { is_minor: dto.isMinor }),
        },
      });

      if (dto.classId !== undefined) {
        await tx.studentClass.deleteMany({ where: { student_id: student.id } });
        await tx.studentClass.create({
          data: { student_id: student.id, class_id: dto.classId },
        });
      }
    });

    return this.findOneByUserId(userId, institutionId);
  }
}
