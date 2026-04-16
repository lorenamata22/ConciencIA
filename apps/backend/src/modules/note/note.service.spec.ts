import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NoteService } from './note.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('NoteService', () => {
  let service: NoteService;
  let prismaMock: PrismaMock;

  const studentId = 'student-id-1';

  const mockNote = {
    id: 'note-id-1',
    student_id: studentId,
    content: 'Equação de 1º grau: ax + b = 0',
    created_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoteService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<NoteService>(NoteService);
  });

  describe('create', () => {
    it('should create note for student', async () => {
      prismaMock.note.create.mockResolvedValue(mockNote as any);

      const result = await service.create({
        student_id: studentId,
        content: 'Equação de 1º grau: ax + b = 0',
      });

      expect(result.id).toBe('note-id-1');
    });
  });

  describe('findByStudent', () => {
    it('should return notes for a student ordered by created_at desc', async () => {
      prismaMock.note.findMany.mockResolvedValue([mockNote] as any);

      await service.findByStudent(studentId);

      expect(prismaMock.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ student_id: studentId }),
          orderBy: expect.objectContaining({ created_at: 'desc' }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete note when student owns it', async () => {
      prismaMock.note.findUnique.mockResolvedValue(mockNote as any);
      prismaMock.note.delete.mockResolvedValue(mockNote as any);

      await service.remove('note-id-1', studentId);
      expect(prismaMock.note.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when student does not own the note', async () => {
      prismaMock.note.findUnique.mockResolvedValue({
        ...mockNote,
        student_id: 'outro-student',
      } as any);

      await expect(service.remove('note-id-1', studentId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when note does not exist', async () => {
      prismaMock.note.findUnique.mockResolvedValue(null);

      await expect(service.remove('note-id-1', studentId)).rejects.toThrow(NotFoundException);
    });
  });
});
