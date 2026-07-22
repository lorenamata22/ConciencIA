// Fetchers client-side de "Mis Apuntes" — chamam as rotas BFF internas
// (app/api/notes) com URL relativa; o cookie httpOnly de auth vai junto.

export interface NoteCard {
  id: string;
  subject_id: string;
  subject_name: string | null;
  topic_id: string;
  title: string;
  preview: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NoteDetail {
  id: string;
  subject_id: string;
  topic_id: string;
  source_message_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  subject: { id: string; name: string } | null;
}

export interface ApiResult<T> {
  data: T | null;
  message: string;
  statusCode: number;
}

export async function getNotes(subjectId?: string): Promise<NoteCard[]> {
  const query = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : '';
  try {
    const res = await fetch(`/api/notes${query}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as NoteCard[]) ?? [];
  } catch {
    return [];
  }
}

export async function getTrashedNotes(): Promise<NoteCard[]> {
  try {
    const res = await fetch('/api/notes/trash', { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as NoteCard[]) ?? [];
  } catch {
    return [];
  }
}

export async function getNote(id: string): Promise<NoteDetail | null> {
  try {
    const res = await fetch(`/api/notes/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as NoteDetail) ?? null;
  } catch {
    return null;
  }
}

export async function createNote(payload: {
  conversation_id: string;
  content: string;
  source_message_id?: string;
}): Promise<ApiResult<NoteDetail>> {
  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return {
    data: (json.data as NoteDetail) ?? null,
    message: json.message ?? '',
    statusCode: res.status,
  };
}

export async function updateNote(
  id: string,
  payload: { title?: string; content?: string },
): Promise<ApiResult<NoteDetail>> {
  const res = await fetch(`/api/notes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return {
    data: (json.data as NoteDetail) ?? null,
    message: json.message ?? '',
    statusCode: res.status,
  };
}

export async function deleteNote(id: string): Promise<ApiResult<NoteDetail>> {
  const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
  const json = await res.json().catch(() => ({}));
  return {
    data: (json.data as NoteDetail) ?? null,
    message: json.message ?? '',
    statusCode: res.status,
  };
}

export async function restoreNote(id: string): Promise<ApiResult<NoteDetail>> {
  const res = await fetch(`/api/notes/${id}/restore`, { method: 'POST' });
  const json = await res.json().catch(() => ({}));
  return {
    data: (json.data as NoteDetail) ?? null,
    message: json.message ?? '',
    statusCode: res.status,
  };
}
