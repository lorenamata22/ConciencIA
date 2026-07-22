import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NoteService } from './note.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('NoteService', () => {
  let service: NoteService;
  let prismaMock: PrismaMock;

  const userId = 'user-id-1';
  const studentId = 'student-id-1';
  const subjectId = 'subject-id-1';
  const topicId = 'topic-id-1';
  const conversationId = 'conversation-id-1';

  const mockStudent = { id: studentId };

  const mockConversation = {
    id: conversationId,
    student_id: studentId,
    subject_id: subjectId,
    topic_id: topicId,
    topic: { id: topicId, title: 'La mitosis y división celular' },
  };

  const mockNote = {
    id: 'note-id-1',
    student_id: studentId,
    subject_id: subjectId,
    topic_id: topicId,
    source_message_id: null,
    title: 'La mitosis y división celular',
    content: 'La mitosis es un tipo de división celular...',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
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
    prismaMock.student.findUnique.mockResolvedValue(mockStudent as any);
  });

  describe('create', () => {
    it('should create note deriving subject, topic and title from the conversation', async () => {
      prismaMock.conversation.findUnique.mockResolvedValue(
        mockConversation as any,
      );
      prismaMock.note.create.mockResolvedValue(mockNote as any);

      await service.create(userId, {
        conversation_id: conversationId,
        content: 'La mitosis es un tipo de división celular...',
      });

      expect(prismaMock.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            student_id: studentId,
            subject_id: subjectId,
            topic_id: topicId,
            title: 'La mitosis y división celular',
            content: 'La mitosis es un tipo de división celular...',
          }),
        }),
      );
    });

    it('should throw ForbiddenException when conversation does not belong to student', async () => {
      prismaMock.conversation.findUnique.mockResolvedValue({
        ...mockConversation,
        student_id: 'other-student',
      } as any);

      await expect(
        service.create(userId, {
          conversation_id: conversationId,
          content: 'x',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when conversation does not exist', async () => {
      prismaMock.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.create(userId, {
          conversation_id: conversationId,
          content: 'x',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByStudent', () => {
    it('should return active notes ordered by updated_at desc', async () => {
      prismaMock.note.findMany.mockResolvedValue([mockNote] as any);

      await service.findByStudent(userId);

      expect(prismaMock.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            deleted_at: null,
          }),
          orderBy: expect.objectContaining({ updated_at: 'desc' }),
        }),
      );
    });

    it('should filter by subject when subjectId is provided', async () => {
      prismaMock.note.findMany.mockResolvedValue([mockNote] as any);

      await service.findByStudent(userId, subjectId);

      expect(prismaMock.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subject_id: subjectId }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return note when student owns it', async () => {
      prismaMock.note.findUnique.mockResolvedValue(mockNote as any);

      const result = await service.findOne(userId, 'note-id-1');
      expect(result.id).toBe('note-id-1');
    });

    it('should throw ForbiddenException when student does not own the note', async () => {
      prismaMock.note.findUnique.mockResolvedValue({
        ...mockNote,
        student_id: 'other-student',
      } as any);

      await expect(service.findOne(userId, 'note-id-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when note does not exist', async () => {
      prismaMock.note.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId, 'note-id-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update title and content when student owns the note', async () => {
      prismaMock.note.findUnique.mockResolvedValue(mockNote as any);
      prismaMock.note.update.mockResolvedValue({
        ...mockNote,
        title: 'Nuevo título',
      } as any);

      await service.update(userId, 'note-id-1', {
        title: 'Nuevo título',
        content: 'Contenido editado',
      });

      expect(prismaMock.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-id-1' },
          data: expect.objectContaining({
            title: 'Nuevo título',
            content: 'Contenido editado',
          }),
        }),
      );
    });

    it('should throw ForbiddenException when student does not own the note', async () => {
      prismaMock.note.findUnique.mockResolvedValue({
        ...mockNote,
        student_id: 'other-student',
      } as any);

      await expect(
        service.update(userId, 'note-id-1', { title: 'x' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should soft delete the note by setting deleted_at', async () => {
      prismaMock.note.findUnique.mockResolvedValue(mockNote as any);
      prismaMock.note.update.mockResolvedValue(mockNote as any);

      await service.remove(userId, 'note-id-1');

      expect(prismaMock.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-id-1' },
          data: expect.objectContaining({ deleted_at: expect.any(Date) }),
        }),
      );
      expect(prismaMock.note.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when student does not own the note', async () => {
      prismaMock.note.findUnique.mockResolvedValue({
        ...mockNote,
        student_id: 'other-student',
      } as any);

      await expect(service.remove(userId, 'note-id-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findTrash', () => {
    it('should purge notes deleted more than 7 days ago then return recent ones', async () => {
      prismaMock.note.deleteMany.mockResolvedValue({ count: 2 } as any);
      prismaMock.note.findMany.mockResolvedValue([mockNote] as any);

      await service.findTrash(userId);

      // Purga: hard delete das notas com deleted_at antigo
      expect(prismaMock.note.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            deleted_at: expect.objectContaining({ lt: expect.any(Date) }),
          }),
        }),
      );
      // Listagem: só soft-deleted (deleted_at not null)
      expect(prismaMock.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            deleted_at: expect.objectContaining({ not: null }),
          }),
        }),
      );
    });
  });

  describe('restore', () => {
    it('should clear deleted_at when student owns the note', async () => {
      prismaMock.note.findUnique.mockResolvedValue({
        ...mockNote,
        deleted_at: new Date(),
      } as any);
      prismaMock.note.update.mockResolvedValue(mockNote as any);

      await service.restore(userId, 'note-id-1');

      expect(prismaMock.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-id-1' },
          data: expect.objectContaining({ deleted_at: null }),
        }),
      );
    });

    it('should throw ForbiddenException when student does not own the note', async () => {
      prismaMock.note.findUnique.mockResolvedValue({
        ...mockNote,
        student_id: 'other-student',
        deleted_at: new Date(),
      } as any);

      await expect(service.restore(userId, 'note-id-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
