import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('ConversationService', () => {
  let service: ConversationService;
  let prismaMock: PrismaMock;

  const studentId = 'student-id-1';
  const userId = 'user-id-1';
  const institutionId = 'inst-id-1';
  const subjectId = 'subject-id-1';
  const topicId = 'topic-id-1';

  const mockConversation = {
    id: 'conv-id-1',
    student_id: studentId,
    subject_id: subjectId,
    topic_id: topicId,
    created_at: new Date(),
  };

  // Tópico no tenant e na matéria certos (cadeia topic → module → subject → course)
  const mockTopic = {
    id: topicId,
    module: {
      subject_id: subjectId,
      subject: { course: { institution_id: institutionId } },
    },
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
    it('should create a conversation scoped to a topic', async () => {
      prismaMock.conversation.create.mockResolvedValue(mockConversation as any);

      const result = await service.create({
        student_id: studentId,
        subject_id: subjectId,
        topic_id: topicId,
      });

      expect(result.topic_id).toBe(topicId);
      expect(prismaMock.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ topic_id: topicId }),
        }),
      );
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
    const setupStudentAndTopic = () => {
      prismaMock.student.findUnique.mockResolvedValue({
        id: studentId,
        user_id: userId,
      } as any);
      prismaMock.topic.findUnique.mockResolvedValue(mockTopic as any);
    };

    it('should resume the latest conversation for the (student, subject, topic)', async () => {
      setupStudentAndTopic();
      prismaMock.conversation.findFirst.mockResolvedValue(
        mockConversation as any,
      );

      const result = await service.resumeOrCreateByUser(
        userId,
        institutionId,
        subjectId,
        topicId,
      );

      expect(result.id).toBe('conv-id-1');
      expect(prismaMock.conversation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            subject_id: subjectId,
            topic_id: topicId,
          }),
          orderBy: expect.objectContaining({ created_at: 'desc' }),
        }),
      );
      expect(prismaMock.conversation.create).not.toHaveBeenCalled();
    });

    it('should create a new conversation when none exists for the topic', async () => {
      setupStudentAndTopic();
      prismaMock.conversation.findFirst.mockResolvedValue(null);
      prismaMock.conversation.create.mockResolvedValue(mockConversation as any);

      const result = await service.resumeOrCreateByUser(
        userId,
        institutionId,
        subjectId,
        topicId,
      );

      expect(result.id).toBe('conv-id-1');
      expect(prismaMock.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            student_id: studentId,
            subject_id: subjectId,
            topic_id: topicId,
          }),
        }),
      );
    });

    it('should throw NotFoundException when user has no student record', async () => {
      prismaMock.student.findUnique.mockResolvedValue(null);

      await expect(
        service.resumeOrCreateByUser(userId, institutionId, subjectId, topicId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when topic does not belong to the subject', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        id: studentId,
        user_id: userId,
      } as any);
      prismaMock.topic.findUnique.mockResolvedValue({
        ...mockTopic,
        module: {
          subject_id: 'outra-materia',
          subject: { course: { institution_id: institutionId } },
        },
      } as any);

      await expect(
        service.resumeOrCreateByUser(userId, institutionId, subjectId, topicId),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.conversation.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when topic belongs to another tenant', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        id: studentId,
        user_id: userId,
      } as any);
      prismaMock.topic.findUnique.mockResolvedValue({
        ...mockTopic,
        module: {
          subject_id: subjectId,
          subject: { course: { institution_id: 'outra-inst' } },
        },
      } as any);

      await expect(
        service.resumeOrCreateByUser(userId, institutionId, subjectId, topicId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByStudentAndTopic', () => {
    it('should filter conversations by student, subject and topic', async () => {
      prismaMock.conversation.findMany.mockResolvedValue([
        mockConversation,
      ] as any);

      const result = await service.findByStudentAndTopic(
        studentId,
        subjectId,
        topicId,
      );

      expect(result).toHaveLength(1);
      expect(prismaMock.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id: studentId,
            subject_id: subjectId,
            topic_id: topicId,
          }),
        }),
      );
    });
  });
});
