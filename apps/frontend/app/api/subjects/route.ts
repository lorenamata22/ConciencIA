import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Criação transacional da matéria (Subject + Modules + Topics) — proxy do
// POST /subjects. O token fica em cookie httpOnly; o client não chama o backend direto.
export async function POST(request: Request) {
  const token = (await cookies()).get("accessToken")?.value ?? "";
  const response = await fetch(`${API_URL}/subjects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: await request.text(),
  });

  return Response.json(await response.json(), { status: response.status });
}
