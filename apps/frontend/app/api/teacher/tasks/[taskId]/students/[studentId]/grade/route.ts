import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value ?? '';
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; studentId: string }> },
) {
  const { taskId, studentId } = await params;
  const token = await getToken();
  const body = await request.json();

  const response = await fetch(
    `${API_URL}/tasks/me/${taskId}/students/${studentId}/grade`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  );

  return Response.json(await response.json(), { status: response.status });
}
