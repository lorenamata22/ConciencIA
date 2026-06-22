import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export type AudienceType = 'student' | 'teacher';

export interface CalendarEvent {
  id: string;
  audience_type: AudienceType;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_by: string;
  eventClasses: { class_id: string }[];
}

export interface SelectableClass {
  id: string;
  name: string;
  course: { name: string };
}

// Lista todos os eventos visíveis ao usuário (visibilidade resolvida no backend pelo JWT)
export async function getEvents(): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(`${API_URL}/events`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as CalendarEvent[]) ?? [];
  } catch {
    return [];
  }
}

// Turmas que o usuário pode selecionar ao criar um evento de aluno
export async function getSelectableClasses(): Promise<SelectableClass[]> {
  try {
    const res = await fetch(`${API_URL}/events/classes`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as SelectableClass[]) ?? [];
  } catch {
    return [];
  }
}
