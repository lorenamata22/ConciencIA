import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value ?? '';
}

// Proxy de streaming do Modo Estudo: repassa o body SSE do backend sem
// bufferizar (Response aceita ReadableStream). EventSource não suporta
// headers e o token é httpOnly — por isso o stream passa por aqui.
export async function POST(request: NextRequest) {
  const token = await getToken();
  const body = await request.text();

  const response = await fetch(`${API_URL}/chat/study/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  // Erros antes dos headers SSE (ex: 401/400 do ValidationPipe) chegam como
  // JSON — repassa como JSON para o client tratar
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('text/event-stream')) {
    return Response.json(await response.json(), { status: response.status });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
