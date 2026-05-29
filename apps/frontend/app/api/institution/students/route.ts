import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';

  const body = await request.json();

  const response = await fetch(`${API_URL}/students/me`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  return Response.json(await response.json(), { status: response.status });
}
