import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  const { subjectId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';

  const body = await request.formData();

  const response = await fetch(`${API_URL}/subjects/me/${subjectId}/program`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  const json = await response.json();
  return Response.json(json, { status: response.status });
}
