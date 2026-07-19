import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import db from '@/lib/db';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET environment variable is not set');
const JWT_SECRET = new TextEncoder().encode(jwtSecret);

export type SessionUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const session = payload as unknown as SessionUser;

    // Rol en naam altijd vers uit de DB lezen: het JWT blijft tot 24h geldig, dus een
    // rolwijziging, naamwijziging of verwijderd account moet meteen doorwerken, niet pas na herinloggen.
    const current = db.prepare('SELECT username, first_name, last_name, role FROM users WHERE id = ?')
      .get(session.id) as { username: string; first_name: string; last_name: string; role: string } | undefined;
    if (!current) return null;

    return {
      ...session,
      username: current.first_name ? `${current.first_name} ${current.last_name}` : current.username,
      first_name: current.first_name,
      last_name: current.last_name,
      role: current.role,
    };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export function getSessionFromToken(token: string): Promise<SessionUser | null> {
  return jwtVerify(token, JWT_SECRET)
    .then(({ payload }) => payload as unknown as SessionUser)
    .catch(() => null);
}
