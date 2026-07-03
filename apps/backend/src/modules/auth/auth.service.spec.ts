import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { StudentService } from '../student/student.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: PrismaMock;
  let jwtService: jest.Mocked<JwtService>;
  let studentServiceMock: { registerWithLicenseCode: jest.Mock };

  const mockUser = {
    id: 'user-id-1',
    institution_id: 'inst-id-1',
    name: 'João Silva',
    email: 'joao@escola.com',
    password: '' as string | null,
    access_code: null as string | null,
    birth_date: null as Date | null,
    user_type: 'student',
    ai_token_limit: null,
    is_minor: false,
    created_at: new Date(),
  };

  // Aniversários relativos à data do teste — evita testes que expiram com o tempo
  const adultBirthDate = new Date(new Date().getFullYear() - 25, 0, 1);
  const minorBirthDate = new Date(new Date().getFullYear() - 10, 0, 1);

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    studentServiceMock = { registerWithLicenseCode: jest.fn() };

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
        {
          provide: EmailService,
          useValue: {
            sendPasswordReset: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: StudentService, useValue: studentServiceMock },
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

      const result = await service.login({
        email: 'joao@escola.com',
        password: 'senha123',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.name).toBe('João Silva');
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

    it('should throw UnauthorizedException when password is null (pending activation)', async () => {
      const user = { ...mockUser, password: null, access_code: 'ABCD1234' };

      prismaMock.user.findUnique.mockResolvedValue(user as any);

      await expect(
        service.login({ email: 'joao@escola.com', password: 'qualquer' }),
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

  describe('validateCode', () => {
    it('should validate license_code and return institution, course and class names', async () => {
      prismaMock.class.findFirst.mockResolvedValue({
        id: 'class-id-1',
        name: 'Turma 3A',
        license_code: 'LIC12345',
        course: { name: 'Ensino Médio', institution: { name: 'Escola X' } },
      } as any);

      const result = await service.validateCode('LIC12345');

      expect(result).toEqual({
        codeType: 'license',
        institutionName: 'Escola X',
        courseName: 'Ensino Médio',
        className: 'Turma 3A',
      });
    });

    it('should validate access_code and return prefill data with class info', async () => {
      prismaMock.class.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: null,
        access_code: 'ABCD1234',
        institution: { name: 'Escola X' },
        student: {
          studentClasses: [
            { class: { name: 'Turma 3A', course: { name: 'Ensino Médio' } } },
          ],
        },
      } as any);

      const result = await service.validateCode('ABCD1234');

      expect(result).toEqual({
        codeType: 'access',
        institutionName: 'Escola X',
        courseName: 'Ensino Médio',
        className: 'Turma 3A',
        prefill: { name: 'João Silva', email: 'joao@escola.com' },
      });
    });

    it('should validate access_code of a teacher without class info', async () => {
      prismaMock.class.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        name: 'Professora Ana',
        email: 'ana@escola.com',
        user_type: 'teacher',
        password: null,
        access_code: 'ABCD1234',
        institution: { name: 'Escola X' },
        student: null,
      } as any);

      const result = await service.validateCode('ABCD1234');

      expect(result).toEqual({
        codeType: 'access',
        institutionName: 'Escola X',
        courseName: null,
        className: null,
        prefill: { name: 'Professora Ana', email: 'ana@escola.com' },
      });
    });

    it('should throw BadRequestException for unknown or already used code', async () => {
      prismaMock.class.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.validateCode('INVALIDO')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('register', () => {
    it('should register student via license_code and return tokens for immediate login', async () => {
      studentServiceMock.registerWithLicenseCode.mockResolvedValue(mockUser);
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.register({
        licenseCode: 'LIC12345',
        name: 'João Silva',
        email: 'joao@escola.com',
        birthDate: adultBirthDate.toISOString(),
        password: 'senha12345',
      });

      expect(studentServiceMock.registerWithLicenseCode).toHaveBeenCalledWith({
        name: 'João Silva',
        email: 'joao@escola.com',
        password: 'senha12345',
        license_code: 'LIC12345',
        birth_date: adultBirthDate,
      });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.name).toBe('João Silva');
    });
  });

  describe('activate', () => {
    it('should activate pre-registered user, set password and clear access_code', async () => {
      const pendingUser = {
        ...mockUser,
        password: null,
        access_code: 'ABCD1234',
      };
      prismaMock.user.findUnique.mockResolvedValue(pendingUser as any);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        password: 'hashed',
        access_code: null,
      } as any);
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.activate({
        accessCode: 'ABCD1234',
        birthDate: adultBirthDate.toISOString(),
        password: 'novasenha1',
      });

      const updateArgs = prismaMock.user.update.mock.calls[0][0];
      expect(updateArgs.where).toEqual({ id: 'user-id-1' });
      expect(updateArgs.data.access_code).toBeNull();
      expect(updateArgs.data.birth_date).toEqual(adultBirthDate);
      // Senha deve ser persistida com hash — nunca em texto puro
      expect(updateArgs.data.password).not.toBe('novasenha1');
      expect(
        await bcrypt.compare('novasenha1', updateArgs.data.password as string),
      ).toBe(true);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.name).toBe('João Silva');
    });

    it('should recalculate is_minor from birth_date on activation', async () => {
      const pendingUser = {
        ...mockUser,
        password: null,
        access_code: 'ABCD1234',
      };
      prismaMock.user.findUnique.mockResolvedValue(pendingUser as any);
      prismaMock.user.update.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('token');

      await service.activate({
        accessCode: 'ABCD1234',
        birthDate: minorBirthDate.toISOString(),
        password: 'novasenha1',
      });

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_minor: true }),
        }),
      );
    });

    it('should update name when provided on activation', async () => {
      const pendingUser = {
        ...mockUser,
        password: null,
        access_code: 'ABCD1234',
      };
      prismaMock.user.findUnique.mockResolvedValue(pendingUser as any);
      prismaMock.user.update.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('token');

      await service.activate({
        accessCode: 'ABCD1234',
        name: 'João da Silva',
        birthDate: adultBirthDate.toISOString(),
        password: 'novasenha1',
      });

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'João da Silva' }),
        }),
      );
    });

    it('should throw BadRequestException when access code does not exist or was already used', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.activate({
          accessCode: 'INVALIDO',
          birthDate: adultBirthDate.toISOString(),
          password: 'novasenha1',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });
});
