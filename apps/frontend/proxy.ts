import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas que não requerem autenticação
const PUBLIC_ROUTES = new Set(['/', '/login']);

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
function parseJwtPayload(token: string): { userType: string } | null {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(Buffer.from(base64, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;

  // Rotas públicas: usuário autenticado vai para /home
  if (PUBLIC_ROUTES.has(pathname)) {
    if (accessToken) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // Rota protegida sem token — redireciona para login
  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Token malformado — limpa cookies e redireciona
  const payload = parseJwtPayload(accessToken);
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    return response;
  }

  // Verifica se o role tem permissão para acessar a rota
  const { userType } = payload;
  const restricted = ROLE_ROUTES.find((r) => pathname.startsWith(r.prefix));

  if (restricted && !restricted.roles.includes(userType)) {
    const home = ROLE_HOME[userType] ?? '/home';
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
