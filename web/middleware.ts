import { NextRequest, NextResponse } from 'next/server';

const CUSTOMER_ROUTES = ['/cases', '/chat'];
const APPROVER_ROUTES = ['/approver'];
const ESCALATION_ROUTES = ['/escalation'];
const AGENT_ROUTES = ['/policies'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('roar_token')?.value;
  const path = request.nextUrl.pathname;

  const isProtected = [
    ...CUSTOMER_ROUTES,
    ...APPROVER_ROUTES,
    ...ESCALATION_ROUTES,
    ...AGENT_ROUTES,
  ].some(route => path === route || path.startsWith(route + '/'));

  if (!isProtected) return NextResponse.next();

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload.role;
    const exp = payload.exp;

    if (exp && exp < Date.now() / 1000) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (APPROVER_ROUTES.some(r => path === r || path.startsWith(r + '/')) && role !== 'approver') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (ESCALATION_ROUTES.some(r => path === r || path.startsWith(r + '/')) && role !== 'escalation') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (CUSTOMER_ROUTES.some(r => path === r || path.startsWith(r + '/')) && role !== 'customer') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (AGENT_ROUTES.some(r => path === r || path.startsWith(r + '/')) && !['approver', 'escalation'].includes(role)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/cases/:path*', '/chat/:path*', '/approver/:path*', '/escalation/:path*', '/policies/:path*'],
};
