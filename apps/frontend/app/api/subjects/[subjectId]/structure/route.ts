import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Sincronização da estrutura (Modules + Topics) de uma matéria existente —
// proxy do PUT /subjects/me/:id/structure. Diff no backend: o que tem id é
// atualizado, o que não tem é criado, o que sumiu é removido se não estiver
// em uso (409 caso contrário).
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  const { subjectId } = await params;
  const token = (await cookies()).get("accessToken")?.value ?? "";

  const response = await fetch(
    `${API_URL}/subjects/me/${subjectId}/structure`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: await request.text(),
    },
  );

  return Response.json(await response.json(), { status: response.status });
}
