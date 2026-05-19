import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  const { subjectId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';

  const response = await fetch(`${API_URL}/subjects/me/${subjectId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  return Response.json(await response.json(), { status: response.status });
}
