'use server';

import { createCourse, updateCourse } from '@/lib/api/subject';

export interface CourseActionState {
  error: string | null;
  success?: boolean;
  courseName?: string;
  courseId?: string;
}

export async function createCourseAction(
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const name = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || undefined;

  if (!name) {
    return { error: 'El nombre del curso es obligatorio.' };
  }

  const result = await createCourse({ name, description });

  if (result.statusCode !== 201 || !result.data) {
    return { error: result.message ?? 'No se pudo crear el curso. Inténtalo de nuevo.' };
  }

  return { error: null, success: true, courseName: result.data.name, courseId: result.data.id };
}

export async function updateCourseAction(
  courseId: string,
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const name = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || undefined;

  if (!name) {
    return { error: 'El nombre del curso es obligatorio.' };
  }

  const result = await updateCourse(courseId, { name, description });

  if (result.statusCode !== 200 || !result.data) {
    return { error: result.message ?? 'No se pudo actualizar el curso. Inténtalo de nuevo.' };
  }

  return { error: null, success: true, courseName: result.data.name, courseId };
}
