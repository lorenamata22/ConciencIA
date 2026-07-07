import { GoogleGenAI } from '@google/genai';
import {
  AICompletionOptions,
  AICompletionResult,
  AIEmbeddingResult,
  AIProvider,
} from '../ai-provider.interface';

// Dimensão fixada em 1024 — acoplada à coluna vector(1024) do schema e ao
// índice HNSW. O gemini-embedding-001 tem 3072 dims por padrão, mas suporta
// truncamento MRL via outputDimensionality. Mudar a dimensão exige migration
// nova na coluna e no índice + re-ingestão de todos os arquivos.
const EMBEDDING_DIMENSIONS = 1024;

// Limite da API do Gemini: BatchEmbedContentsRequest aceita no máximo
// 100 textos por requisição — lotes maiores retornam 400 INVALID_ARGUMENT
const EMBED_BATCH_LIMIT = 98;

// Embeddings truncados (<3072 dims) do Gemini NÃO vêm normalizados — só a
// saída completa de 3072 vem. A busca usa cosseno (invariante à escala),
// mas normalizar é a recomendação da Google e protege uso futuro de dot product.
function normalizeL2(vector: number[]): number[] {
  const norm = Math.hypot(...vector);
  if (norm === 0) return vector;
  return vector.map((value) => value / norm);
}

export interface GeminiAdapterConfig {
  geminiApiKey: string;
  geminiModel: string;
  geminiEmbeddingModel: string;
}

// Adapter do Google Gemini — complete()/stream() e embeddings, tudo via
// @google/genai com a mesma GEMINI_API_KEY.
export class GeminiAdapter implements AIProvider {
  private readonly client: GoogleGenAI;

  constructor(private readonly config: GeminiAdapterConfig) {
    this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }

  getProviderName(): string {
    return 'google';
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const response = await this.client.models.generateContent(
      this.buildRequest(options),
    );
    return {
      content: response.text ?? '',
      promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
      responseTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  async *stream(options: AICompletionOptions): AsyncIterable<string> {
    const stream = await this.client.models.generateContentStream(
      this.buildRequest(options),
    );
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  }

  // Lote nativo: embedContent aceita um array de textos em uma única
  // requisição e devolve um embedding por item, na mesma ordem.
  // Documentos grandes (>100 chunks) são divididos em sub-lotes sequenciais
  // por causa do limite da API — a ordem global é preservada.
  async embed(texts: string[]): Promise<AIEmbeddingResult> {
    const vectors: number[][] = [];

    for (let start = 0; start < texts.length; start += EMBED_BATCH_LIMIT) {
      const batch = texts.slice(start, start + EMBED_BATCH_LIMIT);
      const response = await this.client.models.embedContent({
        model: this.config.geminiEmbeddingModel,
        contents: batch,
        config: { outputDimensionality: EMBEDDING_DIMENSIONS },
      });

      const embeddings = response.embeddings ?? [];
      if (embeddings.length !== batch.length) {
        throw new Error(
          `Gemini embeddings returned ${embeddings.length} vectors for ${batch.length} texts`,
        );
      }

      vectors.push(...embeddings.map((item) => normalizeL2(item.values ?? [])));
    }

    return { vectors, model: this.config.geminiEmbeddingModel };
  }

  // Converte AICompletionOptions para o formato do @google/genai
  // (role 'assistant' → 'model'; system vira systemInstruction)
  private buildRequest(options: AICompletionOptions) {
    return {
      model: this.config.geminiModel,
      contents: options.messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
      config: {
        ...(options.system !== undefined
          ? { systemInstruction: options.system }
          : {}),
        ...(options.maxTokens !== undefined
          ? { maxOutputTokens: options.maxTokens }
          : {}),
        ...(options.temperature !== undefined
          ? { temperature: options.temperature }
          : {}),
      },
    };
  }
}
