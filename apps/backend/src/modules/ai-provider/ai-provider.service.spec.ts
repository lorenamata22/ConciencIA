import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIProviderService } from './ai-provider.service';
import { AICompletionOptions } from './ai-provider.interface';
import { createAIProviderMock } from './ai-provider.mock';

describe('AIProviderService', () => {
  let service: AIProviderService;
  let configService: jest.Mocked<ConfigService>;

  // Config padrão para o provider Google Gemini (texto + embeddings)
  const googleEnv: Record<string, string> = {
    AI_PROVIDER: 'google',
    GEMINI_API_KEY: 'test-gemini-key',
    GEMINI_MODEL: 'gemini-2.5-pro',
    GEMINI_EMBEDDING_MODEL: 'gemini-embedding-001',
  };

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
    it('should return google provider when AI_PROVIDER is "google"', () => {
      configService.get.mockImplementation((key: string) => googleEnv[key]);
      const provider = service.getProvider();
      expect(provider.getProviderName()).toBe('google');
    });

    it('should reuse the same provider instance on subsequent calls', () => {
      configService.get.mockImplementation((key: string) => googleEnv[key]);
      expect(service.getProvider()).toBe(service.getProvider());
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
      const options: AICompletionOptions = {
        messages: [{ role: 'user', content: 'Olá' }],
      };
      const expectedResult = {
        content: 'Resposta',
        promptTokens: 10,
        responseTokens: 5,
      };
      jest.spyOn(service, 'getProvider').mockReturnValue({
        ...createAIProviderMock(),
        complete: jest.fn().mockResolvedValue(expectedResult),
      });

      const result = await service.complete(options);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('completeStructured', () => {
    it('should delegate completeStructured call to the active provider', async () => {
      const expectedResult = {
        data: { answer: '42' },
        promptTokens: 10,
        responseTokens: 5,
      };
      const completeStructuredMock = jest
        .fn()
        .mockResolvedValue(expectedResult);
      jest.spyOn(service, 'getProvider').mockReturnValue({
        ...createAIProviderMock(),
        completeStructured: completeStructuredMock,
      });

      const options = {
        messages: [{ role: 'user' as const, content: 'Pergunta' }],
        jsonSchema: { type: 'object' },
      };
      const result = await service.completeStructured(options);

      expect(completeStructuredMock).toHaveBeenCalledWith(options);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('stream', () => {
    it('should delegate stream call to the active provider', async () => {
      const options: AICompletionOptions = {
        messages: [{ role: 'user', content: 'Olá' }],
      };
      // Gerador assíncrono simulando os chunks do streaming
      async function* fakeStream() {
        await Promise.resolve();
        yield 'Olá';
        yield ' mundo';
      }
      jest.spyOn(service, 'getProvider').mockReturnValue({
        ...createAIProviderMock(),
        stream: jest.fn().mockReturnValue(fakeStream()),
      });

      const chunks: string[] = [];
      for await (const chunk of service.stream(options)) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(['Olá', ' mundo']);
    });
  });

  describe('getProviderName', () => {
    it('should delegate getProviderName call to the active provider', () => {
      jest.spyOn(service, 'getProvider').mockReturnValue({
        ...createAIProviderMock(),
        getProviderName: jest.fn().mockReturnValue('google'),
      });

      expect(service.getProviderName()).toBe('google');
    });
  });

  describe('embed', () => {
    it('should delegate embed call to the active provider', async () => {
      const texts = ['Texto para embedding', 'Outro texto'];
      const expectedResult = {
        vectors: [new Array(1024).fill(0), new Array(1024).fill(0)],
        model: 'voyage-3',
      };
      const embedMock = jest.fn().mockResolvedValue(expectedResult);
      jest.spyOn(service, 'getProvider').mockReturnValue({
        ...createAIProviderMock(),
        embed: embedMock,
      });

      const result = await service.embed(texts);
      expect(embedMock).toHaveBeenCalledWith(texts);
      expect(result).toEqual(expectedResult);
    });
  });
});
