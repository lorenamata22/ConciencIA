import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIProviderService } from './ai-provider.service';

describe('AIProviderService', () => {
  let service: AIProviderService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIProviderService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AIProviderService>(AIProviderService);
    configService = module.get(ConfigService);
  });

  describe('getProvider', () => {
    it('should return anthropic provider when AI_PROVIDER is "anthropic"', () => {
      configService.get.mockReturnValue('anthropic');
      const provider = service.getProvider();
      expect(provider.getProviderName()).toBe('anthropic');
    });

    it('should throw error when AI_PROVIDER is not configured', () => {
      configService.get.mockReturnValue(undefined);
      expect(() => service.getProvider()).toThrow();
    });

    it('should throw error when AI_PROVIDER is unknown', () => {
      configService.get.mockReturnValue('unknown-provider');
      expect(() => service.getProvider()).toThrow();
    });
  });

  describe('complete', () => {
    it('should delegate complete call to the active provider', async () => {
      const options = { messages: [{ role: 'user', content: 'Olá' }] };
      const expectedResult = { content: 'Resposta', promptTokens: 10, responseTokens: 5 };
      jest.spyOn(service, 'getProvider').mockReturnValue({
        complete: jest.fn().mockResolvedValue(expectedResult),
        stream: jest.fn(),
        embed: jest.fn(),
        getProviderName: jest.fn(),
      });

      const result = await service.complete(options as any);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('embed', () => {
    it('should delegate embed call to the active provider', async () => {
      const text = 'Texto para embedding';
      const expectedResult = { vector: new Array(1024).fill(0), model: 'voyage-3' };
      jest.spyOn(service, 'getProvider').mockReturnValue({
        complete: jest.fn(),
        stream: jest.fn(),
        embed: jest.fn().mockResolvedValue(expectedResult),
        getProviderName: jest.fn(),
      });

      const result = await service.embed(text);
      expect(result).toEqual(expectedResult);
    });
  });
});
