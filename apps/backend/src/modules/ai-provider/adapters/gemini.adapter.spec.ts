import { GeminiAdapter } from './gemini.adapter';

// Mocks do SDK @google/genai — nunca chamar a API real em testes
const mockGenerateContent = jest.fn();
const mockGenerateContentStream = jest.fn();
const mockEmbedContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
      embedContent: mockEmbedContent,
    },
  })),
}));

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter;

  const config = {
    geminiApiKey: 'test-gemini-key',
    geminiModel: 'gemini-2.5-pro',
    geminiEmbeddingModel: 'gemini-embedding-001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
    it('should call embedContent once with the whole batch, dimension 1024, and return vectors in order', async () => {
      // Vetores com direções distintas (a normalização preserva a direção)
      const vectorA = [1, ...new Array<number>(1023).fill(0)];
      const vectorB = [0, 1, ...new Array<number>(1022).fill(0)];
      mockEmbedContent.mockResolvedValue({
        embeddings: [{ values: vectorA }, { values: vectorB }],
      });

      const result = await adapter.embed(['Chunk um', 'Chunk dois']);

      // Lote nativo do SDK — uma única chamada com o array inteiro
      expect(mockEmbedContent).toHaveBeenCalledTimes(1);
      expect(mockEmbedContent).toHaveBeenCalledWith({
        model: 'gemini-embedding-001',
        contents: ['Chunk um', 'Chunk dois'],
        // Dimensão acoplada à coluna vector(1024) do schema
        config: { outputDimensionality: 1024 },
      });
      expect(result.model).toBe('gemini-embedding-001');
      expect(result.vectors).toHaveLength(2);
      expect(result.vectors[0]).toHaveLength(1024);
      // Ordem preservada: cada vetor mantém sua direção original
      expect(result.vectors[0][0]).toBeCloseTo(1, 6);
      expect(result.vectors[1][1]).toBeCloseTo(1, 6);
    });

    it('should return L2-normalized vectors (truncated Gemini embeddings are not normalized)', async () => {
      // Vetor com norma 5 (3-4-5) preenchido com zeros até 1024 dims
      const vector = [3, 4, ...new Array<number>(1022).fill(0)];
      mockEmbedContent.mockResolvedValue({ embeddings: [{ values: vector }] });

      const result = await adapter.embed(['Texto']);

      const norm = Math.hypot(...result.vectors[0]);
      expect(norm).toBeCloseTo(1, 6);
      expect(result.vectors[0][0]).toBeCloseTo(0.6, 6);
      expect(result.vectors[0][1]).toBeCloseTo(0.8, 6);
    });

    it('should split batches larger than 100 texts (Gemini API limit) preserving order', async () => {
      // 250 textos → 3 chamadas: 100 + 100 + 50
      const texts = Array.from({ length: 250 }, (_, i) => `Chunk ${i}`);
      mockEmbedContent.mockImplementation(
        ({ contents }: { contents: string[] }) =>
          Promise.resolve({
            embeddings: contents.map((text) => ({
              // Primeiro componente carrega o índice do texto p/ verificar a ordem
              values: [Number(text.split(' ')[1]), ...new Array<number>(1023).fill(1)],
            })),
          }),
      );

      const result = await adapter.embed(texts);

      expect(mockEmbedContent).toHaveBeenCalledTimes(3);
      const sizes = mockEmbedContent.mock.calls.map(
        (call) => (call[0] as { contents: string[] }).contents.length,
      );
      expect(sizes).toEqual([100, 100, 50]);
      expect(result.vectors).toHaveLength(250);
      // Ordem global preservada entre os sub-lotes: componente 0 cresce com o índice
      // (vetores normalizados — compara a proporção, não o valor absoluto)
      expect(result.vectors[0][0]).toBeCloseTo(0, 6);
      expect(result.vectors[249][0]).toBeGreaterThan(result.vectors[100][0]);
    });

    it('should throw when the SDK returns fewer vectors than texts', async () => {
      mockEmbedContent.mockResolvedValue({ embeddings: [] });

      await expect(adapter.embed(['Texto um', 'Texto dois'])).rejects.toThrow(
        /2/,
      );
    });

    it('should propagate SDK errors', async () => {
      mockEmbedContent.mockRejectedValue(new Error('quota exceeded'));

      await expect(adapter.embed(['Texto'])).rejects.toThrow('quota exceeded');
    });
  });
});
