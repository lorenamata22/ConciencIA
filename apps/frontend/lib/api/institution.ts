import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface InstitutionStats {
  total: number;
  active: number;
  pending: number;
  newThisMonth: number;
}

export async function getInstitutionStats(): Promise<InstitutionStats> {
  const fallback: InstitutionStats = { total: 0, active: 0, pending: 0, newThisMonth: 0 };

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    if (!token) return fallback;

    const res = await fetch(`${API_URL}/institutions/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) return fallback;

    const json = await res.json();
    return (json.data as InstitutionStats) ?? fallback;
  } catch {
    return fallback;
  }
}
