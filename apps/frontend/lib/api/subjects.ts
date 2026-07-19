// Fetchers client-side de Nueva Asignatura — chamam as rotas BFF internas
// (app/api/subjects) com URL relativa; o cookie httpOnly de auth vai junto.
//
// Tipos declarados localmente: packages/shared está vazio e desconectado do
// build (o repo já declara tipos em lib/api/* e types/*).

export interface ParsedTopic {
  title: string;
  description: string; // pode ser "" (tópico só com título)
}

export interface ParsedModule {
  name: string;
  topics: ParsedTopic[];
}

export interface ProgramCoverage {
  total_lines: number;
  assigned_lines: number;
  percentage: number;
}

export interface OrphanLine {
  line: number;
  text: string;
}

export interface ProgramParseResult {
  modules: ParsedModule[];
  coverage: ProgramCoverage;
  orphan_lines: OrphanLine[];
}

// Estrutura enviada ao POST /subjects (sem nenhum id client-side)
export interface CreateSubjectPayload {
  course_id: string;
  name: string;
  modules: ParsedModule[];
}

export interface ApiResult<T> {
  data: T | null;
  message: string;
  statusCode: number;
}

// Estrutura persistida de uma matéria existente — carrega a tela de edição.
// Diferente de ParsedModule/ParsedTopic: aqui os registros têm `id`, e é o id
// que preserva progresso, chat e provas do aluno na hora de salvar.
export interface StoredTopic {
  id: string;
  title: string;
  description: string | null;
  order: number;
}

export interface StoredModule {
  id: string;
  name: string;
  order: number;
  topics: StoredTopic[];
}

export interface SubjectStructure {
  id: string;
  name: string;
  course: { id: string; name: string };
  modules: StoredModule[];
}

// Corpo do PUT: `id` opcional — ausente significa "criar"
export interface SyncStructurePayload {
  modules: {
    id?: string;
    name: string;
    topics: { id?: string; title: string; description: string }[];
  }[];
}

export async function syncSubjectStructure(
  subjectId: string,
  payload: SyncStructurePayload,
): Promise<ApiResult<SubjectStructure>> {
  const res = await fetch(`/api/subjects/${subjectId}/structure`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return {
    data: (json.data as SubjectStructure) ?? null,
    message: json.message ?? "",
    statusCode: res.status,
  };
}

export async function parseProgram(
  file: File,
): Promise<ApiResult<ProgramParseResult>> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/subjects/program/parse", {
    method: "POST",
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return {
    data: (json.data as ProgramParseResult) ?? null,
    message: json.message ?? "",
    statusCode: res.status,
  };
}

export async function createSubjectWithModules(
  payload: CreateSubjectPayload,
): Promise<ApiResult<{ id: string; name: string }>> {
  const res = await fetch("/api/subjects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return {
    data: json.data ?? null,
    message: json.message ?? "",
    statusCode: res.status,
  };
}

/* ── Cobertura del programa por el RAG ──────────────────────────────── */

export interface TopicCoverage {
  id: string;
  title: string;
  // true = existe material indexado que el retrieval encontraría para este
  // tema (mismo criterio que usa el Modo Examen para decidir si puede generar)
  covered: boolean;
  document_name: string | null;
}

export interface ModuleCoverage {
  id: string;
  name: string;
  topics: TopicCoverage[];
}

export interface SubjectCoverage {
  subject_id: string;
  subject_name: string;
  modules: ModuleCoverage[];
  covered_count: number;
  total_count: number;
}

export async function getRagCoverage(
  subjectId: string,
): Promise<ApiResult<SubjectCoverage>> {
  const res = await fetch(`/api/subjects/${subjectId}/rag-coverage`);
  const json = await res.json().catch(() => ({}));
  return {
    data: (json.data as SubjectCoverage) ?? null,
    message: json.message ?? "",
    statusCode: res.status,
  };
}
