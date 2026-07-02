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

export interface BaseResponse {
  data: unknown;
  message: string;
  statusCode: number;
}

export async function apiForgotPassword(email: string): Promise<BaseResponse> {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return res.json();
}

// Resultado da validação de código — diz qual fluxo seguir (register vs activate)
export interface ValidateCodeData {
  codeType: 'license' | 'access';
  institutionName: string;
  courseName: string | null;
  className: string | null;
  prefill?: { name: string; email: string };
}

export interface ValidateCodeResponse {
  data: ValidateCodeData | null;
  message: string;
  statusCode: number;
}

export async function apiValidateCode(code: string): Promise<ValidateCodeResponse> {
  const res = await fetch(`${API_URL}/auth/validate-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  return res.json();
}

export interface RegisterPayload {
  licenseCode: string;
  name: string;
  email: string;
  birthDate: string;
  password: string;
}

export async function apiRegister(payload: RegisterPayload): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return res.json();
}

export interface ActivatePayload {
  accessCode: string;
  name?: string;
  birthDate: string;
  password: string;
}

export async function apiActivate(payload: ActivatePayload): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function apiResetPassword(token: string, newPassword: string): Promise<BaseResponse> {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });

  return res.json();
}
