import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value ?? '';
}

// Upload multipart para o FileModule — repassa o FormData ao backend
// (campos: file, subject_id, document_type, is_ai_context)
export async function POST(request: NextRequest) {
  const token = await getToken();
  const formData = await request.formData();

  const response = await fetch(`${API_URL}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  return Response.json(await response.json(), { status: response.status });
}
