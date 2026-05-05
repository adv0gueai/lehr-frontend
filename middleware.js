import { NextResponse } from 'next/server';

export function middleware(request) {
  const jwt = request.cookies.get('jwt');
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Allow /login and /login/ for unauthenticated users
  const isLoginRoute = pathname === '/login' || pathname === '/login/';

  if (!jwt && !isLoginRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|public|api).*)'],
};