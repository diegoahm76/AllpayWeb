// src/middleware.ts
// Middleware simplificado - el matcher ya excluye /api/*, no necesitamos verificación adicional
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Path, optionProtected } from '@/application/shared/path.enum';

const protectedRoutes = optionProtected;

export default auth((req: NextRequest & { auth?: any }) => {
  const { pathname } = req.nextUrl;
  
  const isProtectedRoute = protectedRoutes.some(obj => obj.link === pathname);
  const isLoginPage = pathname === Path.Login || pathname === '/auth/signin';
  
  const isAuthenticated = !!req.auth;
  
  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL(Path.Login, req.nextUrl.origin));
  }
  
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL(Path.Home, req.nextUrl.origin));
  }
  
  return NextResponse.next();
});

export const config = {
  // Excluir explícitamente todas las rutas de NextAuth y API
  // El patrón negativo (?!...) excluye rutas que empiezan con:
  // - api (todas las rutas de API, incluyendo /api/auth/*)
  // - _next (archivos internos de Next.js)
  // - images, icon.png, favicon.ico (archivos estáticos)
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes including /api/auth/*)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/webpack-hmr (webpack hot module replacement)
     * - images (image files)
     * - icon.png (icon file)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|_next/webpack-hmr|images|icon.png|favicon.ico).*)',
  ],
};

export const DEFAULT_REDIRECT_LOGIN_URL = '/auth/signin';

export const DEFAULT_REDIRECT_HOME_URL = '/';