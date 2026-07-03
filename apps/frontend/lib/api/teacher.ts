import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export interface TeacherSubject {
  id: string;
  name: string;
  course: { id: string; name: string };
}

export interface TeacherClass {
  id: string;
  name: string;
  course: { id: string; name: string };
}

export interface TeacherItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  subjects: TeacherSubject[];
  classes: TeacherClass[];
}

export async function getMyTeachers(): Promise<TeacherItem[]> {
  try {
    const res = await fetch(`${API_URL}/teachers/me`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as TeacherItem[]) ?? [];
  } catch {
    return [];
  }
}

export async function getMyTeacher(teacherId: string): Promise<TeacherItem | null> {
  try {
    const res = await fetch(`${API_URL}/teachers/me/${teacherId}`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as TeacherItem) ?? null;
  } catch {
    return null;
  }
}

export interface TeacherDashboardStats {
  activeStudentsCount: number;
  assignedClassesCount: number;
  averageGrade: number | null;
}

export async function getTeacherDashboardStats(): Promise<TeacherDashboardStats> {
  const fallback: TeacherDashboardStats = {
    activeStudentsCount: 0,
    assignedClassesCount: 0,
    averageGrade: null,
  };

  try {
    const res = await fetch(`${API_URL}/teachers/dashboard`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return fallback;
    const json = await res.json();
    return (json.data as TeacherDashboardStats) ?? fallback;
  } catch {
    return fallback;
  }
}
