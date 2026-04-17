const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface LoginResponse {
  data: { accessToken: string; refreshToken: string; name?: string } | null;
  message: string;
  statusCode: number;
}

export interface RefreshResponse {
  data: { accessToken: string } | null;
  message: string;
  statusCode: number;
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  return res.json();
}

export async function apiRefresh(refreshToken: string): Promise<RefreshResponse> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  return res.json();
}
