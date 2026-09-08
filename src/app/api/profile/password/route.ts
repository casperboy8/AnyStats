import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import type { User } from '@/lib/db';

/** POST /api/profile/password — eigen wachtwoord wijzigen (huidig wachtwoord vereist) */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { current_password, new_password } = await req.json();
  if (!current_password || !new_password) {
    return NextResponse.json({ error: 'Huidig en nieuw wachtwoord zijn verplicht' }, { status: 400 });
  }
  if (new_password.length < 6) {
    return NextResponse.json({ error: 'Nieuw wachtwoord moet minimaal 6 tekens zijn' }, { status: 400 });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.id) as User | undefined;
  if (!user || !(await bcrypt.compare(current_password, user.password_hash))) {
    return NextResponse.json({ error: 'Huidig wachtwoord is onjuist' }, { status: 401 });
  }

  const hash = await bcrypt.hash(new_password, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, session.id);

  return NextResponse.json({ ok: true });
}
