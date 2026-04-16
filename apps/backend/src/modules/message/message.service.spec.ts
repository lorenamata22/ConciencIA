import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from './message.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('MessageService', () => {
  let service: MessageService;
  let prismaMock: PrismaMock;

  const mockMessage = {
    id: 'msg-id-1',
    conversation_id: 'conv-id-1',
    role: 'user',
    content: 'O que é uma equação de 1º grau?',
    prompt_tokens: 15,
    response_tokens: 0,
    created_at: new Date(),
  };

  const mockAssistantMessage = {
    id: 'msg-id-2',
    conversation_id: 'conv-id-1',
    role: 'assistant',
    content: 'Uma equação de 1º grau é...',
    prompt_tokens: 0,
    response_tokens: 80,
    created_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  describe('create', () => {
    it('should save user message with role "user"', async () => {
      prismaMock.message.create.mockResolvedValue(mockMessage as any);

      const result = await service.create({
        conversation_id: 'conv-id-1',
        role: 'user',
        content: 'O que é uma equação de 1º grau?',
        prompt_tokens: 15,
        response_tokens: 0,
      });

      expect(result.role).toBe('user');
    });

    it('should save assistant message with token counts', async () => {
      prismaMock.message.create.mockResolvedValue(mockAssistantMessage as any);

      const result = await service.create({
        conversation_id: 'conv-id-1',
        role: 'assistant',
        content: 'Uma equação de 1º grau é...',
        prompt_tokens: 0,
        response_tokens: 80,
      });

      expect(result.role).toBe('assistant');
      expect(result.response_tokens).toBe(80);
    });
  });

  describe('findByConversation', () => {
    it('should return messages ordered by creation date', async () => {
      prismaMock.message.findMany.mockResolvedValue([mockMessage, mockAssistantMessage] as any);

      await service.findByConversation('conv-id-1');

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ conversation_id: 'conv-id-1' }),
          orderBy: expect.objectContaining({ created_at: 'asc' }),
        }),
      );
    });
  });

  describe('getLastN', () => {
    it('should return last N messages for summary context', async () => {
      prismaMock.message.findMany.mockResolvedValue([mockMessage] as any);

      await service.getLastN('conv-id-1', 10);

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ conversation_id: 'conv-id-1' }),
          take: 10,
          orderBy: expect.objectContaining({ created_at: 'desc' }),
        }),
      );
    });
  });
});
