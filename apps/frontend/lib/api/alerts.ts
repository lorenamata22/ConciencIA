import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// Números vêm prontos em `metadata` — renderizar direto, sem parse de string.
export interface AlertMetadata {
  attempts?: number;
  scores?: number[];
  topic_title?: string;
  days_inactive?: number;
  days_since_registration?: number;
  days_without_exam?: number;
}

export interface StudentAlert {
  id: string;
  alert_type: string;
  level: string;
  subject_id: string | null;
  subject_name: string | null;
  topic_id: string | null;
  topic_title: string | null;
  description: string;
  metadata: AlertMetadata;
  created_at: string;
}

export interface ApiResult<T> {
  data: T | null;
  message: string;
  statusCode: number;
}

// Alertas de um aluno, já ordenados pelo backend (level desc, depois recência).
export async function getStudentAlerts(
  studentId: string,
  resolved = false,
): Promise<StudentAlert[]> {
  try {
    const res = await fetch(
      `${API_URL}/students/${studentId}/alerts?resolved=${resolved}`,
      { headers: await authHeaders(), cache: 'no-store' },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as StudentAlert[]) ?? [];
  } catch {
    return [];
  }
}

// Resolução manual pelo professor ("ya hablé con el alumno").
export async function resolveAlert(alertId: string): Promise<ApiResult<null>> {
  const res = await fetch(`${API_URL}/alerts/${alertId}/resolve`, {
    method: 'PATCH',
    headers: await authHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  return {
    data: null,
    message: json.message ?? '',
    statusCode: res.status,
  };
}
