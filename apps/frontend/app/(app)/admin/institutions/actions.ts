'use server';

import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function deleteInstitution(id: string): Promise<{ success: boolean; message: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';

  try {
    const res = await fetch(`${API_URL}/institutions/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();
    return { success: res.ok, message: json.message ?? '' };
  } catch {
    return { success: false, message: 'Error al eliminar la institución' };
  }
}
