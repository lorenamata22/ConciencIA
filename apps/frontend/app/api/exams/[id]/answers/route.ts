import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(
  request: Request,
  context: RouteContext<"/api/exams/[id]/answers">,
) {
  const token = (await cookies()).get("accessToken")?.value ?? "";
  const { id } = await context.params;
  const response = await fetch(
    `${API_URL}/exams/${encodeURIComponent(id)}/answers`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: await request.text(),
    },
  );

  return Response.json(await response.json(), { status: response.status });
}
