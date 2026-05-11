import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Lo sentimos, ese email o contraseña no son correctos.',
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException(
        'Lo sentimos, ese email o contraseña no son correctos.',
      );
    }

    const payload: JwtPayload = {
      userId: user.id,
      institutionId: user.institution_id,
      userType: user.user_type,
    };

    const accessToken = this.jwtService.sign(payload as object, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN') as any,
    });

    const refreshToken = this.jwtService.sign(payload as object, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') as any,
    });

    return { accessToken, refreshToken };
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
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN') as any,
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  async requestPasswordReset(email: string): Promise<{ token: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Retorna sucesso mesmo quando o email não existe (evita enumeração de usuários)
    if (!user) {
      return { token: '' };
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

    return { token };
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
