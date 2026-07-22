import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value ?? '';
}

// Lista as notas ativas do aluno — filtro opcional por matéria
export async function GET(request: NextRequest) {
  const token = await getToken();
  const subjectId = request.nextUrl.searchParams.get('subjectId');
  const query = subjectId
    ? `?subjectId=${encodeURIComponent(subjectId)}`
    : '';

  const response = await fetch(`${API_URL}/notes${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  return Response.json(await response.json(), { status: response.status });
}

// Cria uma nota a partir de uma mensagem do chat
export async function POST(request: NextRequest) {
  const token = await getToken();
  const body = await request.json();

  const response = await fetch(`${API_URL}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  return Response.json(await response.json(), { status: response.status });
}
