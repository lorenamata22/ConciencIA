// Interface da camada de abstração de IA (CLAUDE.md §18).
// Nenhum módulo fora de ai-provider deve importar SDKs de IA diretamente —
// todo acesso passa por esta interface, resolvida pelo AIProviderService.
//
// TODO: mover para packages/shared quando o workspace pnpm for configurado
// (hoje o pacote shared está vazio e o build Docker usa apps/backend como contexto).

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AICompletionResult {
  content: string;
  promptTokens: number;
  responseTokens: number;
}

export interface AIEmbeddingResult {
  vector: number[];
  model: string;
}

export interface AIProvider {
  complete(options: AICompletionOptions): Promise<AICompletionResult>;
  stream(options: AICompletionOptions): AsyncIterable<string>;
  embed(text: string): Promise<AIEmbeddingResult>;
  getProviderName(): string;
}
