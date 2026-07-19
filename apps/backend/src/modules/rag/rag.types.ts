// Payload do job da fila 'rag-ingestion' (CLAUDE.md §19)
export interface RagIngestionJob {
  fileId: string;
  institutionId: string;
  // Escopo denormalizado em Embedding (§7.1). Autoridade na ingestão é o File
  // recarregado do banco; estes campos viajam no job por rastreabilidade.
  subjectId: string | null;
  topicId: string | null;
  fileUrl: string;
  fileName: string;
  // true quando é substituição de arquivo — deleta os embeddings antigos antes
  replaceExisting: boolean;
}

// Metadados obrigatórios de cada chunk (CLAUDE.md §7)
export interface RagChunkMetadata {
  institution_id: string;
  file_id: string;
  subject_id: string | null;
  topic_id: string | null;
  module_id: string | null;
  document_name: string;
}

// Linha retornada pela busca por similaridade no pgvector
export interface RagChunk {
  id: string;
  chunk_text: string;
  metadata: RagChunkMetadata;
  // Distância de cosseno em relação à pergunta (menor = mais relevante)
  distance: number;
}

export interface RagSearchParams {
  query: string;
  institutionId: string;
  subjectId: string;
  topicId?: string;
  topK?: number;
}

// Sonda de cobertura do programa (§7): um tópico "coberto" é aquele para o
// qual existe ao menos um chunk da matéria dentro do limiar de distância —
// exatamente o predicado que o Modo Exame usa para decidir entre gerar a
// prova e devolver 422. Não é contagem de embeddings rotulados: é o que o
// retrieval de fato encontraria.
export interface TopicCoverageQuery {
  topicId: string;
  // Título + ementa do tópico — mesma âncora usada no chat e na geração de exame
  text: string;
}

export interface TopicCoverageItem {
  topic_id: string;
  covered: boolean;
  // Distância do chunk mais próximo; null quando a matéria não tem chunk algum
  best_distance: number | null;
  // Documento que cobre o tópico — null quando não coberto
  document_name: string | null;
}

export interface TopicCoverageResult {
  results: TopicCoverageItem[];
  // A API de embeddings não reporta tokens; estimamos para o registro em
  // AI_Usage (§11 — nenhuma chamada à IA pode ficar sem registro)
  estimatedTokens: number;
  // Modelo de EMBEDDING que rodou de fato — o AI_Usage precisa registrar
  // este, não o modelo de texto do provider (relatório de custo errado)
  model: string;
}

export interface RagSearchResult {
  chunks: RagChunk[];
  // false quando nenhum chunk relevante foi encontrado — o Chat usa isso para
  // responder com conhecimento geral sinalizando o fallback ao usuário
  hasSufficientContext: boolean;
}
