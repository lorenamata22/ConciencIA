// Constantes de Nueva Asignatura (espelham o backend §14). Validação de arquivo
// no client evita round-trip: o mesmo limite de 1MB e os mesmos MIME types.

export const PROGRAM_MAX_FILE_SIZE_BYTES = 1_048_576; // 1MB

export const PROGRAM_ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Extensões aceitas — fallback quando o browser não informa o MIME type
export const PROGRAM_ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

export const PROGRAM_ACCEPT_ATTR =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Abaixo disto, o aviso de cobertura fica mais visível (nunca bloqueia)
export const COVERAGE_WARN_THRESHOLD = 70;

// Valida tipo e tamanho no client. Retorna a mensagem de erro ou null se ok.
export function validateProgramFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const extOk = PROGRAM_ACCEPTED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext),
  );
  const mimeOk = PROGRAM_ACCEPTED_MIME_TYPES.includes(file.type);
  if (!extOk && !mimeOk) {
    return "Formato no soportado. Sube un PDF o DOCX.";
  }
  if (file.size > PROGRAM_MAX_FILE_SIZE_BYTES) {
    return "El archivo supera el límite de 1MB.";
  }
  return null;
}
