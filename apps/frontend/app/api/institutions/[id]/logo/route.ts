import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';

  const body = await request.formData();

  const response = await fetch(`${API_URL}/institutions/${id}/logo`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}
