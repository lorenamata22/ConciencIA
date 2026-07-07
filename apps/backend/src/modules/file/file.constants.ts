// Tipos aceitos para upload no FileModule. Nem todos entram no pipeline RAG:
// jpg/png/xls(x) ficam disponíveis só para download (ver SUPPORTED_RAG_EXTENSIONS)
export const ALLOWED_FILE_TYPES = [
  'pdf',
  'docx',
  'pptx',
  'jpg',
  'jpeg',
  'png',
  'xls',
  'xlsx',
];
