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

export interface Institution {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  representative_name: string | null;
  status: string;
  created_at: string;
}

export interface InstitutionDetail extends Institution {
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  logo_url: string | null;
  ai_token_limit: number | null;
}

export interface InstitutionDetailStats {
  tokenUsage: {
    usedTokens: number;
    remainingTokens: number | null;
    tokenLimit: number | null;
    usagePercent: number;
    currentMonthCost: number;
    inputTokensCost: number;
    outputTokensCost: number;
  };
  users: {
    total: number;
  };
  subjects: {
    total: number;
    withContent: number;
  };
}

export async function getInstitutionById(id: string): Promise<InstitutionDetail | null> {
  try {
    const res = await fetch(`${API_URL}/institutions/${id}`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as InstitutionDetail) ?? null;
  } catch {
    return null;
  }
}

export async function getInstitutionDetailStats(id: string): Promise<InstitutionDetailStats | null> {
  try {
    const res = await fetch(`${API_URL}/institutions/${id}/stats`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as InstitutionDetailStats) ?? null;
  } catch {
    return null;
  }
}

export interface UpdateInstitutionPayload {
  name?: string;
  email?: string;
  phone?: string;
  representativeName?: string;
  address?: string;
  postalCode?: string;
  country?: string;
  city?: string;
  status?: string;
  aiTokenLimit?: number;
}

export interface UpdateInstitutionResponse {
  data: InstitutionDetail | null;
  message: string;
  statusCode: number;
}

export async function uploadInstitutionLogo(id: string, logo: File): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  const fd = new FormData();
  fd.append('logo', logo);
  await fetch(`${API_URL}/institutions/${id}/logo`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
}

export async function updateInstitution(
  id: string,
  payload: UpdateInstitutionPayload,
): Promise<UpdateInstitutionResponse> {
  const res = await fetch(`${API_URL}/institutions/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getInstitutions(): Promise<Institution[]> {
  try {
    const res = await fetch(`${API_URL}/institutions`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as Institution[]) ?? [];
  } catch {
    return [];
  }
}
