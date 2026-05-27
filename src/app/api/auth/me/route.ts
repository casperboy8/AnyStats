import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import type { User } from '@/lib/db';

/**
 * Geeft de huidige gebruiker terug. De rol wordt altijd uit de DB gelezen
 * zodat rolwijzigingen direct doorwerken (JWT kan verouderd zijn).
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  // Lees actuele rol uit DB (JWT kan stale zijn na rolwijziging)
  const user = db.prepare(
    'SELECT id, username, email, role FROM users WHERE id = ?'
  ).get(session.id) as Pick<User, 'id' | 'username' | 'email' | 'role'> | undefined;

  if (!user) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 });

  return NextResponse.json({ ...session, role: user.role });
}
