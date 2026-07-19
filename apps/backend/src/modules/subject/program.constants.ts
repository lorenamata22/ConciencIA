// Constantes do import do programa de asignatura (CLAUDE.md §14).
// O programa é a ementa da matéria — parseado, revisado e descartado; nunca
// vira File nem entra no pipeline de RAG (§7). Não hardcodar nos services.

export const PROGRAM_MAX_FILE_SIZE_BYTES = 1_048_576; // 1MB

// PDF e DOCX aceitos (officeparser extrai texto de ambos)
export const PROGRAM_ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Output do parse é só títulos + números de linha — desacoplado do tamanho
// do documento. Truncamento por max_tokens quebra o structured output.
export const PROGRAM_PARSE_MAX_TOKENS = 2000;
