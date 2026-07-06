import { GeminiAdapter } from './gemini.adapter';

// Mocks do SDK @google/genai — nunca chamar a API real em testes
const mockGenerateContent = jest.fn();
const mockGenerateContentStream = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
    },
  })),
}));

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter;
  let fetchMock: jest.Mock;

  const config = {
    geminiApiKey: 'test-gemini-key',
    geminiModel: 'gemini-2.5-pro',
    voyageApiKey: 'test-voyage-key',
    voyageEmbeddingModel: 'voyage-3',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock do fetch global usado para a REST API da Voyage
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    adapter = new GeminiAdapter(config);
  });

  describe('getProviderName', () => {
    it('should return google as provider name', () => {
      expect(adapter.getProviderName()).toBe('google');
    });
  });

  describe('complete', () => {
    it('should return content and token counts from complete()', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Resposta da IA',
        usageMetadata: {
          promptTokenCount: 42,
          candidatesTokenCount: 17,
        },
      });

      const result = await adapter.complete({
        messages: [{ role: 'user', content: 'Olá' }],
      });

      expect(result).toEqual({
        content: 'Resposta da IA',
        promptTokens: 42,
        responseTokens: 17,
      });
    });

    it('should map assistant role to model and pass system instruction', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'ok',
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
      });

      await adapter.complete({
        system: 'Você é um assistente educacional',
        messages: [
          { role: 'user', content: 'Pergunta' },
          { role: 'assistant', content: 'Resposta anterior' },
          { role: 'user', content: 'Nova pergunta' },
        ],
      });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-pro',
          contents: [
            { role: 'user', parts: [{ text: 'Pergunta' }] },
            { role: 'model', parts: [{ text: 'Resposta anterior' }] },
            { role: 'user', parts: [{ text: 'Nova pergunta' }] },
          ],
          config: expect.objectContaining({
            systemInstruction: 'Você é um assistente educacional',
          }) as Record<string, unknown>,
        }),
      );
    });

    it('should pass maxTokens and temperature to the SDK', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'ok',
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
      });

      await adapter.complete({
        messages: [{ role: 'user', content: 'Olá' }],
        maxTokens: 512,
        temperature: 0.3,
      });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            maxOutputTokens: 512,
            temperature: 0.3,
          }) as Record<string, unknown>,
        }),
      );
    });
  });

  describe('stream', () => {
    it('should yield streamed chunks in order', async () => {
      // Gerador assíncrono simulando os chunks retornados pelo SDK
      mockGenerateContentStream.mockResolvedValue(
        (async function* () {
          await Promise.resolve();
          yield { text: 'Olá' };
          yield { text: ' mundo' };
          yield { text: '!' };
        })(),
      );

      const chunks: string[] = [];
      for await (const chunk of adapter.stream({
        messages: [{ role: 'user', content: 'Olá' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Olá', ' mundo', '!']);
    });
  });

  describe('embed', () => {
    it('should call Voyage API and return embedding vector with model name', async () => {
      const vector = new Array(1024).fill(0.1);
      fetchMock.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: [{ embedding: vector }] }),
      });

      const result = await adapter.embed('Texto para embedding');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.voyageai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-voyage-key',
            'Content-Type': 'application/json',
          }) as Record<string, unknown>,
          body: JSON.stringify({
            input: ['Texto para embedding'],
            model: 'voyage-3',
          }),
        }),
      );
      expect(result).toEqual({ vector, model: 'voyage-3' });
      expect(result.vector).toHaveLength(1024);
    });

    it('should throw when Voyage API responds with an error status', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('{"detail":"invalid api key"}'),
      });

      await expect(adapter.embed('Texto')).rejects.toThrow(/401/);
    });
  });
});
