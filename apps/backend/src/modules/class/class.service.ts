import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertService } from '../alert/alert.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

function generateLicenseCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

const CLASS_SELECT = {
  id: true,
  name: true,
  year: true,
  period: true,
  license_code: true,
  course: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ClassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertService: AlertService,
  ) {}

  async findAllByInstitution(institutionId: string) {
    const classes = await this.prisma.class.findMany({
      where: { course: { institution_id: institutionId } },
      orderBy: { name: 'asc' },
      select: {
        ...CLASS_SELECT,
        // Contagem de alunos e professores vinculados à turma
        _count: { select: { studentClasses: true, teacherClasses: true } },
      },
    });

    return classes.map(({ _count, ...rest }) => ({
      ...rest,
      studentCount: _count.studentClasses,
      teacherCount: _count.teacherClasses,
    }));
  }

  async findUsersByClass(institutionId: string, classId: string) {
    const existing = await this.prisma.class.findFirst({
      where: { id: classId, course: { institution_id: institutionId } },
    });
    if (!existing) throw new NotFoundException('Turma não encontrada');

    return this.prisma.user.findMany({
      where: {
        institution_id: institutionId,
        OR: [
          { student: { studentClasses: { some: { class_id: classId } } } },
          { teacher: { teacherClasses: { some: { class_id: classId } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        user_type: true,
        is_minor: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(institutionId: string, dto: CreateClassDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, institution_id: institutionId },
    });
    if (!course) throw new NotFoundException('Curso não encontrado');

    let license_code: string;
    do {
      license_code = generateLicenseCode();
    } while (await this.prisma.class.findUnique({ where: { license_code } }));

    return this.prisma.class.create({
      data: {
        name: dto.name,
        course_id: dto.courseId,
        year: dto.year ?? new Date().getFullYear(),
        period: dto.period,
        license_code,
      },
      select: CLASS_SELECT,
    });
  }

  async update(institutionId: string, classId: string, dto: UpdateClassDto) {
    const existing = await this.prisma.class.findFirst({
      where: { id: classId, course: { institution_id: institutionId } },
    });
    if (!existing) throw new NotFoundException('Turma não encontrada');

    if (dto.courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, institution_id: institutionId },
      });
      if (!course) throw new NotFoundException('Curso não encontrado');
    }

    return this.prisma.class.update({
      where: { id: classId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.courseId && { course_id: dto.courseId }),
        ...(dto.year && { year: dto.year }),
        ...(dto.period && { period: dto.period }),
      },
      select: CLASS_SELECT,
    });
  }

  async remove(institutionId: string, classId: string) {
    const existing = await this.prisma.class.findFirst({
      where: { id: classId, course: { institution_id: institutionId } },
    });
    if (!existing) throw new NotFoundException('Turma não encontrada');

    await this.prisma.class.delete({ where: { id: classId } });
    return { deleted: true };
  }

  // Roster da turma para o professor, com status de risco derivado dos
  // alertas não-resolvidos (getRiskStudentIds — uma query só).
  // `subjectId` é reservado para escopar notas/atividades quando esses
  // módulos existirem; hoje não altera o resultado.
  async getStudents(
    classId: string,
    institutionId: string,
    _subjectId?: string,
  ) {
    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { course: { select: { institution_id: true } } },
    });
    if (!klass) {
      throw new NotFoundException('Turma não encontrada');
    }
    if (klass.course.institution_id !== institutionId) {
      throw new ForbiddenException('La clase no pertenece a tu institución');
    }

    const roster = await this.prisma.studentClass.findMany({
      where: { class_id: classId },
      select: {
        student: {
          select: {
            id: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
    const students = roster.map((entry) => entry.student);

    const riskIds = await this.alertService.getRiskStudentIds(
      students.map((student) => student.id),
      institutionId,
    );

    return students.map((student) => ({
      id: student.id,
      name: student.user.name,
      email: student.user.email,
      // TODO: módulo Notas (GradeTemplate/StudentGrade) ainda não existe
      average_grade: null,
      // TODO: módulo Atividades (Student_Activity) ainda não existe
      tasks_delivered: null,
      status: riskIds.has(student.id) ? 'at_risk' : 'stable',
    }));
  }
}
