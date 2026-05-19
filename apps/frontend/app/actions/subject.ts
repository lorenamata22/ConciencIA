'use server';

import { createSubject, updateSubject } from '@/lib/api/subject';

export interface SubjectActionState {
  error: string | null;
  success?: boolean;
  subjectName?: string;
  subjectId?: string;
}

export async function createSubjectAction(
  _prev: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  const name = (formData.get('name') as string)?.trim();
  const courseId = (formData.get('courseId') as string)?.trim();

  if (!name) return { error: 'El nombre de la asignatura es obligatorio.' };
  if (!courseId) return { error: 'Selecciona un curso para la asignatura.' };

  const result = await createSubject({ name, courseId });

  if (result.statusCode !== 201 || !result.data) {
    return { error: result.message ?? 'No se pudo registrar la asignatura. Inténtalo de nuevo.' };
  }

  return { error: null, success: true, subjectName: result.data.name, subjectId: result.data.id };
}

export async function updateSubjectAction(
  subjectId: string,
  _prev: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  const name = (formData.get('name') as string)?.trim();
  const courseId = (formData.get('courseId') as string)?.trim() || undefined;

  if (!name) return { error: 'El nombre de la asignatura es obligatorio.' };

  const result = await updateSubject(subjectId, { name, courseId });

  if (result.statusCode !== 200 || !result.data) {
    return { error: result.message ?? 'No se pudo actualizar la asignatura. Inténtalo de nuevo.' };
  }

  return { error: null, success: true, subjectName: result.data.name, subjectId };
}
