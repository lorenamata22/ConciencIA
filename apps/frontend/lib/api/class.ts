import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export interface ClassItem {
  id: string;
  name: string;
  year: number;
  period: string;
  license_code: string;
  course: { id: string; name: string };
}

export async function getMyClasses(): Promise<ClassItem[]> {
  try {
    const res = await fetch(`${API_URL}/classes/me`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as ClassItem[]) ?? [];
  } catch {
    return [];
  }
}

export async function getMyClass(classId: string): Promise<ClassItem | null> {
  try {
    const classes = await getMyClasses();
    return classes.find((c) => c.id === classId) ?? null;
  } catch {
    return null;
  }
}

export async function createClass(data: {
  name: string;
  courseId: string;
  period: string;
}): Promise<{ data: ClassItem | null; message: string; statusCode: number }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/classes/me`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return { data: json.data ?? null, message: json.message ?? '', statusCode: res.status };
}

export async function updateClass(
  classId: string,
  data: { name?: string; courseId?: string; year?: number; period?: string },
): Promise<{ data: ClassItem | null; message: string; statusCode: number }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/classes/me/${classId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return { data: json.data ?? null, message: json.message ?? '', statusCode: res.status };
}
