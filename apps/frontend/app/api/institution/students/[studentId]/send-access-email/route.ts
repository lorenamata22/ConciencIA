import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';

  // O código de acesso é lido do banco pelo backend — nada é enviado no body
  const response = await fetch(`${API_URL}/students/me/${studentId}/send-access-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return Response.json(await response.json(), { status: response.status });
}
