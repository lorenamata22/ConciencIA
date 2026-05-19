'use server';

import { createClass, updateClass } from '@/lib/api/class';

export interface ClassActionState {
  error: string | null;
  success?: boolean;
  className?: string;
  classId?: string;
}

export async function createClassAction(
  _prev: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  const name = (formData.get('name') as string)?.trim();
  const courseId = (formData.get('courseId') as string)?.trim();
  const period = (formData.get('period') as string)?.trim();

  if (!name) return { error: 'El nombre de la clase es obligatorio.' };
  if (!courseId) return { error: 'Selecciona un curso para la clase.' };
  if (!period) return { error: 'Selecciona el turno de la clase.' };

  const result = await createClass({ name, courseId, period });

  if (result.statusCode !== 201 || !result.data) {
    return { error: result.message ?? 'No se pudo registrar la clase. Inténtalo de nuevo.' };
  }

  return { error: null, success: true, className: result.data.name, classId: result.data.id };
}

export async function updateClassAction(
  classId: string,
  _prev: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  const name = (formData.get('name') as string)?.trim();
  const courseId = (formData.get('courseId') as string)?.trim() || undefined;
  const period = (formData.get('period') as string)?.trim() || undefined;

  if (!name) return { error: 'El nombre de la clase es obligatorio.' };

  const result = await updateClass(classId, { name, courseId, period });

  if (result.statusCode !== 200 || !result.data) {
    return { error: result.message ?? 'No se pudo actualizar la clase. Inténtalo de nuevo.' };
  }

  return { error: null, success: true, className: result.data.name, classId };
}
