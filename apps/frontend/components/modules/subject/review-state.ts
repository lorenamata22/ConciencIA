// Estado local editável do review. Cada módulo/tópico ganha uma `key` só para
// o React — NUNCA vai no POST (nada foi persistido, não há id nesta tela).

import type {
  CreateSubjectPayload,
  ParsedModule,
  ProgramParseResult,
  StoredModule,
  SyncStructurePayload,
} from "@/lib/api/subjects";

export interface ReviewTopic {
  key: string;
  // Presente só na edição de matéria existente. É o id que faz o backend
  // ATUALIZAR o tópico em vez de recriá-lo — recriar perderia progresso,
  // conversas e provas do aluno.
  id?: string;
  title: string;
  description: string;
}

export interface ReviewModule {
  key: string;
  id?: string;
  name: string;
  topics: ReviewTopic[];
}

// crypto.randomUUID com fallback (ambientes de teste sem WebCrypto)
export function genKey(): string {
  const cryptoRef = globalThis.crypto as Crypto | undefined;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  return `k-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function emptyTopic(): ReviewTopic {
  return { key: genKey(), title: "", description: "" };
}

export function emptyModule(): ReviewModule {
  return { key: genKey(), name: "", topics: [emptyTopic()] };
}

// Mapeia o resultado do parse para o estado editável
export function toReviewModules(parsed: ParsedModule[]): ReviewModule[] {
  return parsed.map((module) => ({
    key: genKey(),
    name: module.name,
    topics: module.topics.map((topic) => ({
      key: genKey(),
      title: topic.title,
      description: topic.description,
    })),
  }));
}

// Estrutura já persistida → estado editável, preservando os ids
export function toReviewFromStored(stored: StoredModule[]): ReviewModule[] {
  return stored.map((module) => ({
    key: genKey(),
    id: module.id,
    name: module.name,
    topics: module.topics.map((topic) => ({
      key: genKey(),
      id: topic.id,
      title: topic.title,
      description: topic.description ?? "",
    })),
  }));
}

// Corpo do PUT /structure: mantém `id` de quem já existe e omite de quem é
// novo. As keys client nunca vão no body.
export function toSyncPayload(modules: ReviewModule[]): SyncStructurePayload {
  return {
    modules: modules.map((module) => ({
      ...(module.id && { id: module.id }),
      name: module.name.trim(),
      topics: module.topics.map((topic) => ({
        ...(topic.id && { id: topic.id }),
        title: topic.title.trim(),
        description: topic.description,
      })),
    })),
  };
}

// Monta o corpo do POST a partir do estado EDITADO — descarta as keys client
export function toCreatePayload(
  courseId: string,
  name: string,
  modules: ReviewModule[],
): CreateSubjectPayload {
  return {
    course_id: courseId,
    name: name.trim(),
    modules: modules.map((module) => ({
      name: module.name.trim(),
      topics: module.topics.map((topic) => ({
        title: topic.title.trim(),
        description: topic.description,
      })),
    })),
  };
}

// "Registrar" habilita quando a estrutura é mínima e coerente.
// description vazia NÃO bloqueia.
export function canRegister(
  courseId: string,
  name: string,
  modules: ReviewModule[],
): boolean {
  if (!courseId || name.trim() === "") return false;
  if (modules.length === 0) return false;
  return modules.every(
    (module) =>
      module.name.trim() !== "" &&
      module.topics.length >= 1 &&
      module.topics.every((topic) => topic.title.trim() !== ""),
  );
}

export type { ProgramParseResult };
