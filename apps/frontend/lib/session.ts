import 'server-only';
import { cookies } from 'next/headers';

export interface SessionPayload {
  userId: string;
  institutionId: string;
  userType: string;
}

// Lê o payload do JWT sem verificar assinatura (verificação acontece no backend)
export function parseJwtPayload(token: string): SessionPayload | null {
  try {
    const base64 = token.split('.')[1];
    const decoded = Buffer.from(base64, 'base64url').toString('utf-8');
    return JSON.parse(decoded) as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();

  cookieStore.set('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15, // 15 minutos — mesmo que JWT_ACCESS_EXPIRES_IN
  });

  cookieStore.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 dias — mesmo que JWT_REFRESH_EXPIRES_IN
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return null;
  return parseJwtPayload(token);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
  cookieStore.delete('userName');
}

// Salva o nome do usuário em cookie não-httpOnly para leitura na tela de boas-vindas
export async function saveUserName(name: string) {
  const cookieStore = await cookies();
  cookieStore.set('userName', name, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getUserName(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('userName')?.value ?? null;
}
