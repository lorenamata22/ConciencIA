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

const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias — mesmo que JWT_REFRESH_EXPIRES_IN

// O accessToken é sempre cookie de sessão: a validade real dele é o `exp` do JWT,
// que o proxy verifica a cada request. Quem carrega a decisão de "guardar sesión"
// é o refreshToken — com maxAge ele sobrevive ao fechar do browser, sem maxAge não.
// Devolve a persistência efetivamente aplicada — pode ser menor que a pedida
// (ver shouldPersist). Quem grava outros cookies da sessão deve usar este retorno,
// não o rememberMe cru, para não divergir da regra.
export async function createSession(
  accessToken: string,
  refreshToken: string,
  rememberMe = true,
): Promise<{ persisted: boolean }> {
  const cookieStore = await cookies();

  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  const persisted = shouldPersist(accessToken, rememberMe);

  cookieStore.set('accessToken', accessToken, base);

  cookieStore.set('refreshToken', refreshToken, {
    ...base,
    ...(persisted ? { maxAge: REFRESH_MAX_AGE } : {}),
  });

  return { persisted };
}

// Contas administrativas não ganham sessão persistente: elas gerenciam turmas,
// notas e usuários, então morrem ao fechar o browser mesmo que o usuário tenha
// marcado "guardar sesión". Token ilegível cai no lado seguro (não persiste).
const NON_PERSISTENT_ROLES = new Set(['super_admin', 'institution']);

function shouldPersist(accessToken: string, rememberMe: boolean): boolean {
  if (!rememberMe) return false;
  const payload = parseJwtPayload(accessToken);
  if (!payload) return false;
  return !NON_PERSISTENT_ROLES.has(payload.userType);
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

// Salva o nome do usuário em cookie não-httpOnly para leitura na tela de boas-vindas.
// Acompanha a persistência do refreshToken para não sobreviver à sessão.
export async function saveUserName(name: string, rememberMe = true) {
  const cookieStore = await cookies();
  cookieStore.set('userName', name, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(rememberMe ? { maxAge: REFRESH_MAX_AGE } : {}),
  });
}

export async function getUserName(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('userName')?.value ?? null;
}
