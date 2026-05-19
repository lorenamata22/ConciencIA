import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export interface SubjectItem {
  id: string;
  name: string;
  description: string | null;
  course: { id: string; name: string };
}

export interface CourseOption {
  id: string;
  name: string;
  description: string | null;
}

export async function getMySubjects(): Promise<SubjectItem[]> {
  try {
    const res = await fetch(`${API_URL}/subjects/me`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as SubjectItem[]) ?? [];
  } catch {
    return [];
  }
}

export async function getMyCourses(): Promise<CourseOption[]> {
  try {
    const res = await fetch(`${API_URL}/courses/me`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as CourseOption[]) ?? [];
  } catch {
    return [];
  }
}
