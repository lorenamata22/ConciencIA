import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Response } from 'express';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationService } from '../conversation/conversation.service';
import { MessageService } from '../message/message.service';

describe('ChatController', () => {
  let controller: ChatController;
  let chatServiceMock: jest.Mocked<ChatService>;
  let conversationServiceMock: jest.Mocked<ConversationService>;
  let messageServiceMock: jest.Mocked<MessageService>;

  const user = {
    userId: 'user-id-1',
    institutionId: 'inst-id-1',
    userType: 'student',
  };

  const mockConversation = {
    id: 'conv-id-1',
    student_id: 'student-id-1',
    subject_id: 'subject-id-1',
    topic_id: null,
    created_at: new Date(),
  };

  const createResMock = () =>
    ({
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    }) as unknown as jest.Mocked<Response>;

  beforeEach(async () => {
    chatServiceMock = {
      sendStudyMessage: jest.fn(),
    } as any;
    conversationServiceMock = {
      resumeOrCreateByUser: jest.fn().mockResolvedValue(mockConversation),
    } as any;
    messageServiceMock = {
      findByConversation: jest.fn().mockResolvedValue([]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: chatServiceMock },
        { provide: ConversationService, useValue: conversationServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  describe('getConversation', () => {
    it('should resume latest conversation and return it with messages', async () => {
      const messages = [{ id: 'msg-1', role: 'user', content: 'Hola' }];
      messageServiceMock.findByConversation.mockResolvedValue(messages as any);

      const result = await controller.getConversation(
        user as any,
        'subject-id-1',
      );

      expect(conversationServiceMock.resumeOrCreateByUser).toHaveBeenCalledWith(
        'user-id-1',
        'subject-id-1',
      );
      expect(messageServiceMock.findByConversation).toHaveBeenCalledWith(
        'conv-id-1',
      );
      expect(result).toEqual({
        conversation: mockConversation,
        messages,
      });
    });

    it('should throw BadRequestException when subject_id is missing', async () => {
      await expect(
        controller.getConversation(user as any, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('streamStudy', () => {
    const dto = { conversation_id: 'conv-id-1', content: 'Pergunta' };

    it('should set SSE headers before streaming', async () => {
      chatServiceMock.sendStudyMessage.mockResolvedValue({
        content: 'resposta',
        promptTokens: 10,
        responseTokens: 5,
      });
      const res = createResMock();

      await controller.streamStudy(user as any, dto, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    });

    it('should forward chunks as SSE chunk events and finish with done event', async () => {
      chatServiceMock.sendStudyMessage.mockImplementation(
        async (_dto, _userId, _instId, onChunk) => {
          onChunk?.('Una ecuación');
          onChunk?.(' lineal');
          return {
            content: 'Una ecuación lineal',
            promptTokens: 10,
            responseTokens: 5,
          };
        },
      );
      const res = createResMock();

      await controller.streamStudy(user as any, dto, res);

      const written = (res.write as jest.Mock).mock.calls
        .map((call) => call[0] as string)
        .join('');

      expect(written).toContain('event: chunk');
      expect(written).toContain(JSON.stringify({ text: 'Una ecuación' }));
      expect(written).toContain(JSON.stringify({ text: ' lineal' }));
      expect(written).toContain('event: done');
      expect(written).toContain('"prompt_tokens":10');
      expect(written).toContain('"response_tokens":5');
      expect(res.end).toHaveBeenCalled();
    });

    it('should emit error event (not throw) when service fails, and always end response', async () => {
      chatServiceMock.sendStudyMessage.mockRejectedValue(
        new ForbiddenException('Límite de tokens de IA alcanzado'),
      );
      const res = createResMock();

      await controller.streamStudy(user as any, dto, res);

      const written = (res.write as jest.Mock).mock.calls
        .map((call) => call[0] as string)
        .join('');

      expect(written).toContain('event: error');
      expect(written).toContain('Límite de tokens de IA alcanzado');
      expect(written).toContain('403');
      expect(res.end).toHaveBeenCalled();
    });
  });
});
