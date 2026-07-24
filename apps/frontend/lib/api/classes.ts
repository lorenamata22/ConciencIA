import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// Status de risco é derivado no backend (alertas não-resolvidos) — o front só renderiza.
export type StudentRiskStatus = 'stable' | 'at_risk';

export interface ClassStudent {
  id: string;
  name: string;
  email: string;
  average_grade: number | null;
  tasks_delivered: number | null;
  status: StudentRiskStatus;
}

// Roster da turma com status de risco pronto (GET /classes/:classId/students).
// Única fonte com status real — o endpoint do professor devolve status null.
export async function getClassStudents(
  classId: string,
  subjectId?: string,
): Promise<ClassStudent[]> {
  const query = subjectId ? `?subject_id=${encodeURIComponent(subjectId)}` : '';
  try {
    const res = await fetch(`${API_URL}/classes/${classId}/students${query}`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as ClassStudent[]) ?? [];
  } catch {
    return [];
  }
}
