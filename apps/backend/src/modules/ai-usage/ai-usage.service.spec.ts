import { Test, TestingModule } from '@nestjs/testing';
import { AIUsageService } from './ai-usage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('AIUsageService', () => {
  let service: AIUsageService;
  let prismaMock: PrismaMock;

  const institutionId = 'inst-id-1';
  const userId = 'user-id-1';

  const mockUsage = {
    id: 'usage-id-1',
    institution_id: institutionId,
    user_id: userId,
    conversation_id: 'conv-id-1',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    prompt_tokens: 100,
    response_tokens: 50,
    cost: 0.00015,
    created_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIUsageService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AIUsageService>(AIUsageService);
  });

  describe('register', () => {
    it('should save AI usage record with all required fields', async () => {
      prismaMock.aIUsage.create.mockResolvedValue(mockUsage as any);

      const result = await service.register({
        institution_id: institutionId,
        user_id: userId,
        conversation_id: 'conv-id-1',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        prompt_tokens: 100,
        response_tokens: 50,
        cost: 0.00015,
      });

      expect(result.id).toBe('usage-id-1');
      expect(prismaMock.aIUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institution_id: institutionId,
            user_id: userId,
            prompt_tokens: 100,
            response_tokens: 50,
          }),
        }),
      );
    });

    it('should register usage even without conversation_id (non-chat calls)', async () => {
      prismaMock.aIUsage.create.mockResolvedValue({
        ...mockUsage,
        conversation_id: null,
      } as any);

      const result = await service.register({
        institution_id: institutionId,
        user_id: userId,
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        prompt_tokens: 50,
        response_tokens: 100,
        cost: 0.0002,
      });

      expect(result.conversation_id).toBeNull();
    });
  });

  describe('getTotalUsageByUser', () => {
    it('should sum total tokens used by a specific user', async () => {
      prismaMock.aIUsage.aggregate.mockResolvedValue({
        _sum: { prompt_tokens: 500, response_tokens: 300 },
      } as any);

      const total = await service.getTotalUsageByUser(userId);
      expect(total).toBe(800);
    });

    it('should return 0 when user has no usage records', async () => {
      prismaMock.aIUsage.aggregate.mockResolvedValue({
        _sum: { prompt_tokens: null, response_tokens: null },
      } as any);

      const total = await service.getTotalUsageByUser(userId);
      expect(total).toBe(0);
    });
  });

  describe('getTotalUsageByInstitution', () => {
    it('should sum total tokens used by all users of an institution', async () => {
      prismaMock.aIUsage.aggregate.mockResolvedValue({
        _sum: { prompt_tokens: 5000, response_tokens: 3000 },
      } as any);

      const total = await service.getTotalUsageByInstitution(institutionId);
      expect(total).toBe(8000);
    });
  });

  describe('findByInstitution', () => {
    it('should return usage records filtered by institution_id', async () => {
      prismaMock.aIUsage.findMany.mockResolvedValue([mockUsage] as any);

      const result = await service.findByInstitution(institutionId);

      expect(result).toHaveLength(1);
      expect(prismaMock.aIUsage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: institutionId }),
        }),
      );
    });
  });
});
