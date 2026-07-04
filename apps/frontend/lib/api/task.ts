import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export interface TaskOption {
  id: string;
  name: string;
}

export interface TaskFormOptions {
  subjects: TaskOption[];
  classes: TaskOption[];
}

export interface TaskListItem {
  id: string;
  name: string;
  subject: { id: string; name: string };
  classes: { id: string; name: string }[];
}

export interface TaskDetail {
  id: string;
  name: string;
  subject: { id: string; name: string };
  classes: { id: string; name: string }[];
}

export interface StudentTaskGrade {
  taskId: string;
  title: string;
  subjectId: string;
  subjectName: string;
  grade: string | null;
}

type MutationResult<T> = { data: T | null; message: string; statusCode: number };

// Matérias e turmas do professor — para os dropdowns do formulário
export async function getTaskFormOptions(): Promise<TaskFormOptions> {
  const fallback: TaskFormOptions = { subjects: [], classes: [] };
  try {
    const res = await fetch(`${API_URL}/tasks/me/form-options`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return fallback;
    const json = await res.json();
    return (json.data as TaskFormOptions) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getMyTasks(subjectId?: string): Promise<TaskListItem[]> {
  try {
    const query = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : '';
    const res = await fetch(`${API_URL}/tasks/me${query}`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as TaskListItem[]) ?? [];
  } catch {
    return [];
  }
}

export async function getMyTask(taskId: string): Promise<TaskDetail | null> {
  try {
    const res = await fetch(`${API_URL}/tasks/me/${taskId}`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as TaskDetail) ?? null;
  } catch {
    return null;
  }
}

// Tareas + nota do aluno numa turma (tela Alumnos)
export async function getStudentTaskGrades(
  studentId: string,
  classId: string,
): Promise<StudentTaskGrade[]> {
  try {
    const res = await fetch(
      `${API_URL}/tasks/me/students/${studentId}/grades?classId=${encodeURIComponent(classId)}`,
      { headers: await authHeaders(), cache: 'no-store' },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as StudentTaskGrade[]) ?? [];
  } catch {
    return [];
  }
}

export async function createTask(data: {
  name: string;
  subjectId: string;
  classIds: string[];
}): Promise<MutationResult<TaskDetail>> {
  const res = await fetch(`${API_URL}/tasks/me`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return { data: json.data ?? null, message: json.message ?? '', statusCode: res.status };
}

export async function updateTask(
  taskId: string,
  data: { name: string; subjectId: string; classIds: string[] },
): Promise<MutationResult<TaskDetail>> {
  const res = await fetch(`${API_URL}/tasks/me/${taskId}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return { data: json.data ?? null, message: json.message ?? '', statusCode: res.status };
}
