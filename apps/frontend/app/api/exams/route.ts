import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request: Request) {
  const token = (await cookies()).get("accessToken")?.value ?? "";
  const response = await fetch(`${API_URL}/exams`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: await request.text(),
  });

  return Response.json(await response.json(), { status: response.status });
}
