import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value ?? '';
}

// Retoma (ou cria) a conversa da matéria — proxy do GET /chat/conversations.
// O token fica em cookie httpOnly, por isso o client não chama o backend direto.
export async function GET(request: NextRequest) {
  const token = await getToken();
  const subjectId = request.nextUrl.searchParams.get('subjectId') ?? '';
  const topicId = request.nextUrl.searchParams.get('topicId') ?? '';

  const response = await fetch(
    `${API_URL}/chat/conversations?subject_id=${encodeURIComponent(subjectId)}&topic_id=${encodeURIComponent(topicId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  );

  return Response.json(await response.json(), { status: response.status });
}
