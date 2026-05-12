import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export interface InstitutionStats {
  total: number;
  active: number;
  pending: number;
  newThisMonth: number;
}

export async function getInstitutionStats(): Promise<InstitutionStats> {
  const fallback: InstitutionStats = { total: 0, active: 0, pending: 0, newThisMonth: 0 };

  try {
    const res = await fetch(`${API_URL}/institutions/stats`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) return fallback;
    const json = await res.json();
    return (json.data as InstitutionStats) ?? fallback;
  } catch {
    return fallback;
  }
}

export interface CreateInstitutionPayload {
  name: string;
  email: string;
  password: string;
  representativeName: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  country?: string;
  city?: string;
}

export interface CreateInstitutionResponse {
  data: { id: string; name: string } | null;
  message: string;
  statusCode: number;
}

export async function createInstitution(
  payload: CreateInstitutionPayload,
): Promise<CreateInstitutionResponse> {
  const res = await fetch(`${API_URL}/institutions`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  return res.json();
}
