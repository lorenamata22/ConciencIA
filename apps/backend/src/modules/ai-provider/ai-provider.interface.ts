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

// Uso real de tokens reportado pelo provider ao final de um stream —
// stream() continua AsyncIterable<string>, o callback é o canal lateral
// para o consumidor registrar AI_Usage com números reais em vez de estimativa.
export interface AIStreamUsage {
  promptTokens: number;
  responseTokens: number;
}

export interface AICompletionOptions {
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  onUsage?: (usage: AIStreamUsage) => void;
}

export interface AICompletionResult {
  content: string;
  promptTokens: number;
  responseTokens: number;
}

// Resultado do embedding em lote: um vetor por texto de entrada, na mesma ordem
export interface AIEmbeddingResult {
  vectors: number[][];
  model: string;
}

// Chamada com structured output: o provider força a resposta a aderir ao
// JSON Schema informado (gerado por z.toJSONSchema no consumidor). O adapter
// garante forma sintática (JSON válido); validação semântica é do consumidor.
export interface AIStructuredOptions extends AICompletionOptions {
  jsonSchema: Record<string, unknown>;
}

export interface AIStructuredResult<T = unknown> {
  data: T;
  promptTokens: number;
  responseTokens: number;
}

// Resposta truncada por maxTokens quebra o structured output (JSON incompleto)
// — erro dedicado para o consumidor tratar sem tentar o parse.
export class AIResponseTruncatedError extends Error {
  constructor(
    readonly promptTokens = 0,
    readonly responseTokens = 0,
    message = 'AI response truncated by max tokens limit',
  ) {
    super(message);
    this.name = 'AIResponseTruncatedError';
  }
}

export interface AIProvider {
  complete(options: AICompletionOptions): Promise<AICompletionResult>;
  completeStructured<T = unknown>(
    options: AIStructuredOptions,
  ): Promise<AIStructuredResult<T>>;
  stream(options: AICompletionOptions): AsyncIterable<string>;
  embed(texts: string[]): Promise<AIEmbeddingResult>;
  getProviderName(): string;
  // Opcional: nome do modelo de texto ativo — usado no registro de AI_Usage
  getModelName?(): string;
}
