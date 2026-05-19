import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function getMyPeriodOptions(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/period-options/me`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as string[]) ?? [];
  } catch {
    return [];
  }
}
