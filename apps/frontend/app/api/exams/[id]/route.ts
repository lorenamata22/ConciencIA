import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  _request: Request,
  context: RouteContext<"/api/exams/[id]">,
) {
  const token = (await cookies()).get("accessToken")?.value ?? "";
  const { id } = await context.params;
  const response = await fetch(`${API_URL}/exams/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  return Response.json(await response.json(), { status: response.status });
}
