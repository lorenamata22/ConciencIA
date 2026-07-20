import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas que não requerem autenticação
const PUBLIC_ROUTES = new Set(['/', '/login', '/forgot-password', '/complete-registration']);

// Prefixos públicos (subrotas dinâmicas)
const PUBLIC_PREFIXES = ['/reset-password/'];

// Prefixos restritos por role
const ROLE_ROUTES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/student',     roles: ['student'] },
  { prefix: '/teacher',     roles: ['teacher'] },
  { prefix: '/institution', roles: ['institution'] },
  { prefix: '/admin',       roles: ['super_admin'] },
];

// Rota de destino padrão por role (usado no redirect ao acessar rota errada)
const ROLE_HOME: Record<string, string> = {
  student:     '/student',
  teacher:     '/teacher',
  institution: '/institution',
  super_admin: '/admin',
};

// Node.js runtime — Buffer disponível
function parseJwtPayload(token: string): { userType: string; exp?: number } | null {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(Buffer.from(base64, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

// Margem de segurança: renova um pouco antes do exp para não mandar ao backend
// um token que expira no meio do voo
const EXPIRY_SKEW_SECONDS = 30;

function isExpired(payload: { exp?: number }): boolean {
  if (!payload.exp) return false;
  return payload.exp - EXPIRY_SKEW_SECONDS <= Math.floor(Date.now() / 1000);
}

// Troca o refresh token por um access token novo. Retorna null se o refresh
// não valer mais — aí a sessão acabou de verdade.
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const body = await res.json();
    return body?.data?.accessToken ?? null;
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('accessToken');
  response.cookies.delete('refreshToken');
  response.cookies.delete('userName');
  return response;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;

  // Server Actions não podem receber redirect HTTP: o cliente do Next tenta parsear
  // a resposta como payload de action e quebra com "An unexpected response was
  // received from the server.". Deixa passar — o guard de sessão do layout e o
  // JWT guard do backend continuam valendo.
  if (request.headers.get('next-action')) {
    return NextResponse.next();
  }

  // Rotas públicas: usuário autenticado vai para /home
  const isPublic =
    PUBLIC_ROUTES.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublic) {
    if (accessToken && PUBLIC_ROUTES.has(pathname)) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  let payload = accessToken ? parseJwtPayload(accessToken) : null;

  // Sem access token válido, tenta renovar com o refresh token antes de desistir.
  // É isto que mantém a sessão viva além dos 15 minutos do access token.
  let renewedAccessToken: string | null = null;
  if (!payload || isExpired(payload)) {
    const refreshToken = request.cookies.get('refreshToken')?.value;
    if (!refreshToken) return redirectToLogin(request);

    renewedAccessToken = await refreshAccessToken(refreshToken);
    if (!renewedAccessToken) return redirectToLogin(request);

    payload = parseJwtPayload(renewedAccessToken);
    if (!payload) return redirectToLogin(request);
  }

  // Propaga o token renovado para o browser e para o render desta mesma request
  const attachRenewedToken = (response: NextResponse) => {
    if (renewedAccessToken) {
      response.cookies.set('accessToken', renewedAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    return response;
  };

  // Verifica se o role tem permissão para acessar a rota
  const { userType } = payload;
  const restricted = ROLE_ROUTES.find((r) => pathname.startsWith(r.prefix));

  if (restricted && !restricted.roles.includes(userType)) {
    const home = ROLE_HOME[userType] ?? '/home';
    return attachRenewedToken(NextResponse.redirect(new URL(home, request.url)));
  }

  // Reescreve o cookie na request também, para que o render desta mesma
  // navegação já enxergue o token novo (senão o layout leria o token vencido)
  if (renewedAccessToken) {
    request.cookies.set('accessToken', renewedAccessToken);
    return attachRenewedToken(NextResponse.next({ request }));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
