import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export interface StudentClass {
  id: string;
  name: string;
  course: { id: string; name: string };
}

export interface StudentItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  isMinor: boolean;
  class: StudentClass | null;
}

export async function getMyStudent(userId: string): Promise<StudentItem | null> {
  try {
    const res = await fetch(`${API_URL}/students/me/${userId}`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as StudentItem) ?? null;
  } catch {
    return null;
  }
}
