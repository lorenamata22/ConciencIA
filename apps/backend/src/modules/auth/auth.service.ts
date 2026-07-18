import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ValidateCodeResult } from './dto/validate-code.dto';
import { RegisterDto } from './dto/register.dto';
import { ActivateDto } from './dto/activate.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmailService } from '../email/email.service';
import { StudentService } from '../student/student.service';
import { isMinor } from '../../common/utils/age';

interface TokenizableUser {
  id: string;
  institution_id: string;
  user_type: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly studentService: StudentService,
  ) {}

  private issueTokens(user: TokenizableUser): {
    accessToken: string;
    refreshToken: string;
    name: string;
  } {
    const payload: JwtPayload = {
      userId: user.id,
      institutionId: user.institution_id,
      userType: user.user_type,
    };

    const accessToken = this.jwtService.sign(payload as object, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload as object, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    return { accessToken, refreshToken, name: user.name };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string; name: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Lo sentimos, ese email o contraseña no son correctos.',
      );
    }

    // Senha nula = pré-cadastro ainda não ativado — nunca comparar bcrypt contra null
    if (!user.password) {
      throw new UnauthorizedException(
        'Cuenta pendiente de activación. Utiliza tu código de acceso para completar el registro.',
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException(
        'Lo sentimos, ese email o contraseña no son correctos.',
      );
    }

    return this.issueTokens(user);
  }

  // Valida license_code (turma) ou access_code (pré-cadastro) num único endpoint
  async validateCode(code: string): Promise<ValidateCodeResult> {
    const classRecord = await this.prisma.class.findFirst({
      where: { license_code: code },
      include: {
        course: {
          select: { name: true, institution: { select: { name: true } } },
        },
      },
    });

    if (classRecord) {
      return {
        codeType: 'license',
        institutionName: classRecord.course.institution.name,
        courseName: classRecord.course.name,
        className: classRecord.name,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { access_code: code },
      include: {
        institution: { select: { name: true } },
        student: {
          include: {
            studentClasses: {
              include: {
                class: { include: { course: { select: { name: true } } } },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (user) {
      const studentClass = user.student?.studentClasses[0]?.class ?? null;
      return {
        codeType: 'access',
        institutionName: user.institution.name,
        courseName: studentClass?.course.name ?? null,
        className: studentClass?.name ?? null,
        prefill: { name: user.name, email: user.email },
      };
    }

    throw new BadRequestException('Código inválido ou expirado.');
  }

  // Auto-cadastro externo via license_code — acesso liberado imediatamente
  async register(
    dto: RegisterDto,
  ): Promise<{ accessToken: string; refreshToken: string; name: string }> {
    const user = await this.studentService.registerWithLicenseCode({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      license_code: dto.licenseCode,
      birth_date: new Date(dto.birthDate),
    });

    return this.issueTokens(user);
  }

  // Ativação de pré-cadastro via access_code — define senha e consome o código
  async activate(
    dto: ActivateDto,
  ): Promise<{ accessToken: string; refreshToken: string; name: string }> {
    const user = await this.prisma.user.findUnique({
      where: { access_code: dto.accessCode },
    });

    if (!user) {
      throw new BadRequestException('Código inválido ou já utilizado.');
    }

    const birthDate = new Date(dto.birthDate);
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const activated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        birth_date: birthDate,
        is_minor: isMinor(birthDate),
        access_code: null,
        ...(dto.name !== undefined && { name: dto.name }),
      },
    });

    return this.issueTokens(activated);
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const newPayload: JwtPayload = {
        userId: payload.userId,
        institutionId: payload.institutionId,
        userType: payload.userType,
      };

      const accessToken = this.jwtService.sign(newPayload as object, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  // SEGURANÇA: o token de reset viaja SOMENTE no email — nunca no corpo da
  // resposta HTTP. Devolvê-lo permitiria takeover de qualquer conta sem
  // acesso ao email da vítima. A resposta é uniforme (anti-enumeração).
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const uniformResponse = {
      message:
        'Si el email está registrado, enviaremos un enlace de recuperación.',
    };

    const user = await this.prisma.user.findUnique({ where: { email } });

    // Resposta idêntica mesmo quando o email não existe (evita enumeração)
    if (!user) {
      return uniformResponse;
    }

    // Invalida tokens anteriores não utilizados do mesmo usuário
    await this.prisma.passwordResetToken.updateMany({
      where: { user_id: user.id, used: false },
      data: { used: true },
    });

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    await this.prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expiresAt,
      },
    });

    await this.emailService.sendPasswordReset(user.email, token);

    return uniformResponse;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.used || record.expires_at < new Date()) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.user_id },
        data: { password: hashed },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
    ]);
  }
}
