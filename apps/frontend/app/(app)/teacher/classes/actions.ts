'use server';

import { revalidatePath } from 'next/cache';
import { resolveAlert } from '@/lib/api/alerts';

export interface ResolveAlertState {
  error: string | null;
  success?: boolean;
}

// Resolve manual do alerta e revalida a visão individual do aluno para que
// o alerta resolvido desapareça (a lista busca só resolved=false).
export async function resolveAlertAction(
  alertId: string,
  classId: string,
  studentId: string,
): Promise<ResolveAlertState> {
  const result = await resolveAlert(alertId);

  if (result.statusCode !== 200 && result.statusCode !== 204) {
    return { error: result.message || 'No se pudo resolver la alerta. Inténtalo de nuevo.' };
  }

  revalidatePath(`/teacher/classes/${classId}/students/${studentId}`);
  return { error: null, success: true };
}
