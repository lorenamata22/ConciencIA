import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value ?? '';
}

export async function GET() {
  const token = await getToken();
  const response = await fetch(`${API_URL}/period-options/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Response.json(await response.json(), { status: response.status });
}

export async function PUT(request: NextRequest) {
  const token = await getToken();
  const body = await request.json();
  const response = await fetch(`${API_URL}/period-options/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return Response.json(await response.json(), { status: response.status });
}
