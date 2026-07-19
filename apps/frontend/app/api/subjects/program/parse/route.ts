import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Parse do programa de asignatura (multipart) — proxy do POST
// /subjects/program/parse. Reencaminha o FormData recebido do client; o fetch
// define o Content-Type multipart com boundary automaticamente (não setar à mão).
export async function POST(request: Request) {
  const token = (await cookies()).get("accessToken")?.value ?? "";
  const form = await request.formData();

  const response = await fetch(`${API_URL}/subjects/program/parse`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  return Response.json(await response.json(), { status: response.status });
}
