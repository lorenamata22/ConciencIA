import { GoogleGenAI } from '@google/genai';
import {
  AICompletionOptions,
  AICompletionResult,
  AIEmbeddingResult,
  AIProvider,
} from '../ai-provider.interface';

const VOYAGE_EMBEDDINGS_URL = 'https://api.voyageai.com/v1/embeddings';

export interface GeminiAdapterConfig {
  geminiApiKey: string;
  geminiModel: string;
  voyageApiKey: string;
  voyageEmbeddingModel: string;
}

// Adapter do Google Gemini para complete()/stream().
// Embeddings continuam na Voyage AI via REST (ver comentário em embed()) —
// a interface AIProvider é o único ponto de entrada; nenhum outro módulo
// deve saber que existe uma chamada separada para a Voyage.
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

  // Embeddings via Voyage AI: o schema fixa embedding_vector como vector(1024),
  // acoplado à dimensão do modelo voyage-3 (VOYAGE_EMBEDDING_MODEL). Se o modelo
  // de embedding mudar de dimensão um dia, é preciso migration nova na coluna e
  // no índice HNSW. Essa dependência é exclusiva dos embeddings/Voyage —
  // independente do provider de texto (Gemini ou qualquer outro).
  // Lote nativo: a Voyage aceita um array de textos em uma única requisição
  // e devolve um embedding por item, na mesma ordem.
  async embed(texts: string[]): Promise<AIEmbeddingResult> {
    const response = await fetch(VOYAGE_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.voyageApiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.config.voyageEmbeddingModel,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Voyage AI embeddings request failed (${response.status}): ${body}`,
      );
    }

    const result = (await response.json()) as {
      data: { embedding: number[] }[];
    };
    return {
      vectors: result.data.map((item) => item.embedding),
      model: this.config.voyageEmbeddingModel,
    };
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
