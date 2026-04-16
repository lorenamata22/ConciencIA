import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('UserService', () => {
  let service: UserService;
  let prismaMock: PrismaMock;

  const institutionId = 'inst-id-1';

  const mockUser = {
    id: 'user-id-1',
    institution_id: institutionId,
    name: 'Maria',
    email: 'maria@escola.com',
    password: 'hashed',
    user_type: 'teacher',
    ai_token_limit: null,
    is_minor: false,
    created_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('findOne', () => {
    it('should return user when institution_id matches', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.findOne('user-id-1', institutionId);
      expect(result.id).toBe('user-id-1');
    });

    it('should throw ForbiddenException when user belongs to different institution', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, institution_id: 'outro-inst' } as any);

      await expect(service.findOne('user-id-1', institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente', institutionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllByInstitution', () => {
    it('should filter users by institution_id from JWT', async () => {
      prismaMock.user.findMany.mockResolvedValue([mockUser] as any);

      await service.findAllByInstitution(institutionId);

      // institution_id deve vir sempre do JWT, nunca do body
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: institutionId }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update user from same institution', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.user.update.mockResolvedValue({ ...mockUser, name: 'Maria Atualizada' } as any);

      const result = await service.update('user-id-1', { name: 'Maria Atualizada' }, institutionId);
      expect(result.name).toBe('Maria Atualizada');
    });

    it('should throw ForbiddenException when trying to update user from different institution', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, institution_id: 'outro-inst' } as any);

      await expect(
        service.update('user-id-1', { name: 'Hack' }, institutionId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete user from same institution', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.user.delete.mockResolvedValue(mockUser as any);

      await service.remove('user-id-1', institutionId);
      expect(prismaMock.user.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when deleting user from different institution', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, institution_id: 'outro-inst' } as any);

      await expect(service.remove('user-id-1', institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
