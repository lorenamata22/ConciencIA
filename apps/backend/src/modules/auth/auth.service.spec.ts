import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: PrismaMock;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-id-1',
    institution_id: 'inst-id-1',
    name: 'João Silva',
    email: 'joao@escola.com',
    password: '',
    user_type: 'student',
    ai_token_limit: null,
    is_minor: false,
    created_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('should return access and refresh tokens on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('senha123', 10);
      const user = { ...mockUser, password: hashedPassword };

      prismaMock.user.findUnique.mockResolvedValue(user as any);
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login({ email: 'joao@escola.com', password: 'senha123' });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'naoexiste@escola.com', password: 'senha' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const hashedPassword = await bcrypt.hash('outrasenha', 10);
      const user = { ...mockUser, password: hashedPassword };

      prismaMock.user.findUnique.mockResolvedValue(user as any);

      await expect(
        service.login({ email: 'joao@escola.com', password: 'senhaerrada' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should include userId, institutionId and userType in JWT payload', async () => {
      const hashedPassword = await bcrypt.hash('senha123', 10);
      const user = { ...mockUser, password: hashedPassword };

      prismaMock.user.findUnique.mockResolvedValue(user as any);
      jwtService.sign.mockReturnValue('token');

      await service.login({ email: 'joao@escola.com', password: 'senha123' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id-1',
          institutionId: 'inst-id-1',
          userType: 'student',
        }),
        expect.anything(),
      );
    });
  });

  describe('refreshToken', () => {
    it('should return new access token for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({
        userId: 'user-id-1',
        institutionId: 'inst-id-1',
        userType: 'student',
      });
      jwtService.sign.mockReturnValue('novo-access-token');

      const result = await service.refreshToken('valid-refresh-token');
      expect(result.accessToken).toBe('novo-access-token');
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refreshToken('token-invalido')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
