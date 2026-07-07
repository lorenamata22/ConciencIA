// Constantes do pipeline RAG — valores ajustáveis conforme observação em produção

export const QUEUE_RAG_INGESTION = 'rag-ingestion';

// Tipos aceitos no pipeline de ingestão no MVP. JPG/PNG (exigiriam OCR) e
// XLS (exigiria parsing de planilha) ficam fora — continuam disponíveis para
// download via FileModule, só não entram no RAG.
export const SUPPORTED_RAG_EXTENSIONS = ['pdf', 'docx', 'pptx'];

// Guard de texto insuficiente: abaixo disso o arquivo é tratado como
// escaneado/sem camada de texto e marcado como failed (não é OCR)
export const MIN_EXTRACTED_TEXT_LENGTH = 50;

// Sliding window em caracteres (~4 chars/token): ~600 tokens por chunk,
// dentro da faixa 400–800 exigida, com ~100 tokens de overlap
export const CHUNK_SIZE_CHARS = 2400;
export const CHUNK_OVERLAP_CHARS = 400;

// Top K padrão da busca por similaridade (faixa 3–5 do CLAUDE.md §7)
export const DEFAULT_TOP_K = 5;

// Distância de cosseno máxima para um chunk contar como contexto relevante —
// o top-K do pgvector sempre retorna K vizinhos, mesmo irrelevantes
export const MAX_COSINE_DISTANCE = 0.65;
