import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  _request: Request,
  context: RouteContext<"/api/subjects/[subjectId]/exam-outline">,
) {
  const token = (await cookies()).get("accessToken")?.value ?? "";
  const { subjectId } = await context.params;
  const response = await fetch(
    `${API_URL}/subjects/student/me/${encodeURIComponent(subjectId)}/exam-outline`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  return Response.json(await response.json(), { status: response.status });
}
