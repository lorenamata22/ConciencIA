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

export async function getMyCourse(courseId: string): Promise<CourseOption | null> {
  try {
    const courses = await getMyCourses();
    return courses.find((c) => c.id === courseId) ?? null;
  } catch {
    return null;
  }
}

export async function createCourse(data: { name: string; description?: string }): Promise<{ data: CourseOption | null; message: string; statusCode: number }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/courses/me`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return { data: json.data ?? null, message: json.message ?? '', statusCode: res.status };
}

export async function updateCourse(courseId: string, data: { name: string; description?: string }): Promise<{ data: CourseOption | null; message: string; statusCode: number }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/courses/me/${courseId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return { data: json.data ?? null, message: json.message ?? '', statusCode: res.status };
}
