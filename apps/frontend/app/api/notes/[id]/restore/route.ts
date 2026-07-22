import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value ?? '';
}

// Restaura uma nota da lixeira
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = await getToken();

  const response = await fetch(`${API_URL}/notes/${id}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  return Response.json(await response.json(), { status: response.status });
}
