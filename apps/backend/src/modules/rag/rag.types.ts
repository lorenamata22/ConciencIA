// Payload do job da fila 'rag-ingestion' (CLAUDE.md §19)
export interface RagIngestionJob {
  fileId: string;
  institutionId: string;
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

export interface RagSearchResult {
  chunks: RagChunk[];
  // false quando nenhum chunk relevante foi encontrado — o Chat usa isso para
  // responder com conhecimento geral sinalizando o fallback ao usuário
  hasSufficientContext: boolean;
}
