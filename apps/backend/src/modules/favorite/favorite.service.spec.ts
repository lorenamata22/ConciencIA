import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let prismaMock: PrismaMock;

  const studentId = 'student-id-1';

  const mockFavoriteMessage = {
    id: 'fav-id-1',
    student_id: studentId,
    message_id: 'msg-id-1',
    file_id: null,
  };

  const mockFavoriteFile = {
    id: 'fav-id-2',
    student_id: studentId,
    message_id: null,
    file_id: 'file-id-1',
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
  });

  describe('create', () => {
    it('should create favorite with message_id only', async () => {
      prismaMock.favorite.create.mockResolvedValue(mockFavoriteMessage as any);

      const result = await service.create({
        student_id: studentId,
        message_id: 'msg-id-1',
      });

      expect(result.message_id).toBe('msg-id-1');
      expect(result.file_id).toBeNull();
    });

    it('should create favorite with file_id only', async () => {
      prismaMock.favorite.create.mockResolvedValue(mockFavoriteFile as any);

      const result = await service.create({
        student_id: studentId,
        file_id: 'file-id-1',
      });

      expect(result.file_id).toBe('file-id-1');
      expect(result.message_id).toBeNull();
    });

    it('should throw BadRequestException when both message_id and file_id are provided', async () => {
      // REGRA INEGOCIÁVEL: Favorite deve ter exatamente um dos dois campos
      await expect(
        service.create({
          student_id: studentId,
          message_id: 'msg-id-1',
          file_id: 'file-id-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when neither message_id nor file_id is provided', async () => {
      await expect(
        service.create({
          student_id: studentId,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByStudent', () => {
    it('should return favorites for a student', async () => {
      prismaMock.favorite.findMany.mockResolvedValue([mockFavoriteMessage] as any);

      const result = await service.findByStudent(studentId);

      expect(result).toHaveLength(1);
      expect(prismaMock.favorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ student_id: studentId }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete favorite when student owns it', async () => {
      prismaMock.favorite.findUnique.mockResolvedValue(mockFavoriteMessage as any);
      prismaMock.favorite.delete.mockResolvedValue(mockFavoriteMessage as any);

      await service.remove('fav-id-1', studentId);
      expect(prismaMock.favorite.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when student does not own the favorite', async () => {
      prismaMock.favorite.findUnique.mockResolvedValue({
        ...mockFavoriteMessage,
        student_id: 'outro-student',
      } as any);

      await expect(service.remove('fav-id-1', studentId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when favorite does not exist', async () => {
      prismaMock.favorite.findUnique.mockResolvedValue(null);

      await expect(service.remove('fav-id-1', studentId)).rejects.toThrow(NotFoundException);
    });
  });
});
