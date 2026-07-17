import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('ConversationService', () => {
  let service: ConversationService;
  let prismaMock: PrismaMock;

  const studentId = 'student-id-1';

  const mockConversation = {
    id: 'conv-id-1',
    student_id: studentId,
    subject_id: 'subject-id-1',
    topic_id: null,
    created_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
  });

  describe('create', () => {
    it('should create conversation for study mode (without topic)', async () => {
      prismaMock.conversation.create.mockResolvedValue(mockConversation as any);

      const result = await service.create({
        student_id: studentId,
        subject_id: 'subject-id-1',
      });

      expect(result.id).toBe('conv-id-1');
      expect(result.topic_id).toBeNull();
    });

    it('should create conversation for exam mode (with topic)', async () => {
      const examConversation = { ...mockConversation, topic_id: 'topic-id-1' };
      prismaMock.conversation.create.mockResolvedValue(examConversation as any);

      const result = await service.create({
        student_id: studentId,
        subject_id: 'subject-id-1',
        topic_id: 'topic-id-1',
      });

      expect(result.topic_id).toBe('topic-id-1');
    });
  });

  describe('findOne', () => {
    it('should return conversation when student owns it', async () => {
      prismaMock.conversation.findUnique.mockResolvedValue(
        mockConversation as any,
      );

      const result = await service.findOne('conv-id-1', studentId);
      expect(result.id).toBe('conv-id-1');
    });

    it('should throw ForbiddenException when student does not own conversation', async () => {
      prismaMock.conversation.findUnique.mockResolvedValue({
        ...mockConversation,
        student_id: 'outro-student',
      } as any);

      await expect(service.findOne('conv-id-1', studentId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when conversation does not exist', async () => {
      prismaMock.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('id-inexistente', studentId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resumeOrCreateByUser', () => {
    const userId = 'user-id-1';

    it('should resume the latest conversation for the subject when one exists', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        id: studentId,
        user_id: userId,
      } as any);
      prismaMock.conversation.findFirst.mockResolvedValue(
        mockConversation as any,
      );

      const result = await service.resumeOrCreateByUser(userId, 'subject-id-1');

      expect(result.id).toBe('conv-id-1');
      expect(prismaMock.conversation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            subject_id: 'subject-id-1',
          }),
          orderBy: expect.objectContaining({ created_at: 'desc' }),
        }),
      );
      expect(prismaMock.conversation.create).not.toHaveBeenCalled();
    });

    it('should create a new conversation when none exists for the subject', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        id: studentId,
        user_id: userId,
      } as any);
      prismaMock.conversation.findFirst.mockResolvedValue(null);
      prismaMock.conversation.create.mockResolvedValue(mockConversation as any);

      const result = await service.resumeOrCreateByUser(userId, 'subject-id-1');

      expect(result.id).toBe('conv-id-1');
      expect(prismaMock.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            student_id: studentId,
            subject_id: 'subject-id-1',
          }),
        }),
      );
    });

    it('should throw NotFoundException when user has no student record', async () => {
      prismaMock.student.findUnique.mockResolvedValue(null);

      await expect(
        service.resumeOrCreateByUser(userId, 'subject-id-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByStudentAndSubject', () => {
    it('should return conversations filtered by student and subject', async () => {
      prismaMock.conversation.findMany.mockResolvedValue([
        mockConversation,
      ] as any);

      const result = await service.findByStudentAndSubject(
        studentId,
        'subject-id-1',
      );

      expect(result).toHaveLength(1);
      expect(prismaMock.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            subject_id: 'subject-id-1',
          }),
        }),
      );
    });
  });
});
