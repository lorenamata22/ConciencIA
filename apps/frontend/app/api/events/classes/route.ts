import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value ?? '';
}

export async function GET() {
  const token = await getToken();

  const response = await fetch(`${API_URL}/events/classes`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  return Response.json(await response.json(), { status: response.status });
}
