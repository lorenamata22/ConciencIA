import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export type IngestionStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Arquivo do FileModule (materiais de IA) — distinto do DriveFile (Archivos)
export interface AiFileItem {
  id: string;
  name: string;
  url: string;
  size: number;
  subject_id: string | null;
  is_ai_context: boolean;
  ingestion_status: IngestionStatus;
  ingestion_error: string | null;
  created_at: string;
}

// Arquivos do tenant que alimentam o RAG (is_ai_context=true)
export async function getAiContextFiles(): Promise<AiFileItem[]> {
  try {
    const res = await fetch(`${API_URL}/files`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    const files = (json.data as AiFileItem[]) ?? [];
    return files.filter((file) => file.is_ai_context);
  } catch {
    return [];
  }
}
