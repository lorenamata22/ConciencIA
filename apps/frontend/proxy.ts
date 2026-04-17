import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas públicas (sem autenticação obrigatória)
const PUBLIC_PATHS = ['/', '/login', '/welcome'];

// Rotas onde usuário autenticado NÃO deve ser redirecionado pro dashboard
// (ex: /welcome é acessado logo após o login)
const AUTH_BYPASS_PATHS = ['/welcome'];

// Mapa de roles para seus dashboards
const ROLE_PATHS: Record<string, string> = {
  student: '/dashboard/student',
  teacher: '/dashboard/teacher',
  institution: '/dashboard/institution',
  super_admin: '/dashboard/admin',
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isAuthBypass = AUTH_BYPASS_PATHS.some((p) => pathname.startsWith(p));
  const accessToken = request.cookies.get('accessToken')?.value;

  // Usuário não autenticado tentando acessar rota protegida
  if (!isPublic && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Usuário autenticado acessando login ou seleção de perfil → redirecionar para dashboard
  if (isPublic && !isAuthBypass && accessToken) {
    try {
      const base64 = accessToken.split('.')[1];
      const payload = JSON.parse(Buffer.from(base64, 'base64url').toString());
      const destination = ROLE_PATHS[payload.userType] ?? '/dashboard/student';
      return NextResponse.redirect(new URL(destination, request.url));
    } catch {
      // Token corrompido — deixar passar para o login limpar a sessão
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
