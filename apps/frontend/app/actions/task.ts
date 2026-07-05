'use server';

import { createTask, updateTask } from '@/lib/api/task';

export interface TaskActionState {
  error: string | null;
  success?: boolean;
  taskName?: string;
  taskId?: string;
}

// O MultiSelect serializa os ids como JSON num input hidden — parse defensivo
function parseClassIds(raw: FormData): string[] {
  try {
    const value = raw.get('classIds');
    if (typeof value !== 'string' || !value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

type ValidationResult =
  | { ok: false; error: string }
  | { ok: true; name: string; subjectId: string; classIds: string[] };

function validate(formData: FormData): ValidationResult {
  const name = (formData.get('name') as string)?.trim();
  const subjectId = (formData.get('subjectId') as string)?.trim();
  const classIds = parseClassIds(formData);

  if (!name) return { ok: false, error: 'El nombre de la tarea es obligatorio.' };
  if (!subjectId) return { ok: false, error: 'Selecciona una asignatura.' };
  if (classIds.length === 0) return { ok: false, error: 'Selecciona al menos una clase.' };

  return { ok: true, name, subjectId, classIds };
}

export async function createTaskAction(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const parsed = validate(formData);
  if (!parsed.ok) return { error: parsed.error };

  const { name, subjectId, classIds } = parsed;
  const result = await createTask({ name, subjectId, classIds });
  if (result.statusCode !== 201 || !result.data) {
    return { error: result.message ?? 'No se pudo registrar la tarea. Inténtalo de nuevo.' };
  }

  return { error: null, success: true, taskName: result.data.name, taskId: result.data.id };
}

export async function updateTaskAction(
  taskId: string,
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const parsed = validate(formData);
  if (!parsed.ok) return { error: parsed.error };

  const { name, subjectId, classIds } = parsed;
  const result = await updateTask(taskId, { name, subjectId, classIds });
  if (result.statusCode !== 200 || !result.data) {
    return { error: result.message ?? 'No se pudo actualizar la tarea. Inténtalo de nuevo.' };
  }

  return { error: null, success: true, taskName: result.data.name, taskId };
}
