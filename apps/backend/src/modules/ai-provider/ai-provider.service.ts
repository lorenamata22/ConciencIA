import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AICompletionOptions,
  AICompletionResult,
  AIEmbeddingResult,
  AIProvider,
} from './ai-provider.interface';
import { GeminiAdapter } from './adapters/gemini.adapter';

// Ponto único de acesso à IA (CLAUDE.md §18). O provider ativo é definido
// por AI_PROVIDER. Para adicionar um novo provider: criar o adapter,
// registrar no switch abaixo e adicionar as variáveis de ambiente.
@Injectable()
export class AIProviderService {
  private provider: AIProvider | null = null;

  constructor(private readonly config: ConfigService) {}

  // Resolução lazy com cache — o adapter só é criado no primeiro uso
  getProvider(): AIProvider {
    if (this.provider) return this.provider;

    const providerName = this.config.get<string>('AI_PROVIDER');
    switch (providerName) {
      case 'google':
        this.provider = new GeminiAdapter({
          geminiApiKey: this.config.get<string>('GEMINI_API_KEY', ''),
          geminiModel: this.config.get<string>(
            'GEMINI_MODEL',
            'gemini-2.5-pro',
          ),
          voyageApiKey: this.config.get<string>('VOYAGE_API_KEY', ''),
          voyageEmbeddingModel: this.config.get<string>(
            'VOYAGE_EMBEDDING_MODEL',
            'voyage-3',
          ),
        });
        return this.provider;
      default:
        throw new Error(
          `Unknown or missing AI_PROVIDER: "${providerName ?? ''}". Supported providers: google`,
        );
    }
  }

  complete(options: AICompletionOptions): Promise<AICompletionResult> {
    return this.getProvider().complete(options);
  }

  stream(options: AICompletionOptions): AsyncIterable<string> {
    return this.getProvider().stream(options);
  }

  embed(texts: string[]): Promise<AIEmbeddingResult> {
    return this.getProvider().embed(texts);
  }

  getProviderName(): string {
    return this.getProvider().getProviderName();
  }
}
