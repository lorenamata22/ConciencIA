import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Proxy da sonda de cobertura do programa. O token fica em cookie httpOnly —
// o client nunca chama o backend direto.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  const { subjectId } = await params;
  const token = (await cookies()).get("accessToken")?.value ?? "";

  const response = await fetch(
    `${API_URL}/subjects/me/${subjectId}/rag-coverage`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  return Response.json(await response.json(), { status: response.status });
}
