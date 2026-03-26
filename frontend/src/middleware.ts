import { NextRequest, NextResponse } from 'next/server';

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://api:4000';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/api/') || pathname === '/health' || pathname.startsWith('/health/')) {
    const target = new URL(pathname + search, API_INTERNAL_URL);
    return NextResponse.rewrite(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/health/:path*'],
};
