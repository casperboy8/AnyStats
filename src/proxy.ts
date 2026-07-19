import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import db from '@/lib/db';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET environment variable is not set');
const JWT_SECRET = new TextEncoder().encode(jwtSecret);

const publicPaths = ['/login', '/register'];
const publicApiPaths = ['/api/auth/login', '/api/auth/register', '/api/push/vapid-public-key', '/api/invite/', '/join'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicApiPaths.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Root: landingspagina voor iedereen, page.tsx handelt de auth-redirect
  if (pathname === '/') return NextResponse.next();

  const token = request.cookies.get('session')?.value;

  if (publicPaths.some(p => pathname.startsWith(p))) {
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL('/select-org', request.url));
      } catch { /* expired token, show login */ }
    }
    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      // Rol vers uit de DB lezen: het JWT blijft tot 24h geldig, dus een
      // demotie moet meteen doorwerken en niet pas na het verlopen van het token.
      const user = db.prepare('SELECT role FROM users WHERE id = ?').get(payload.id) as { role: string } | undefined;
      const isAdmin = user?.role === 'admin';

      if (!isAdmin) {
        if (pathname.startsWith('/api/admin')) {
          return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sessie verlopen' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|icons|.*\\.png$|.*\\.ico$).*)'],
};
