import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createSession } from '@/lib/auth';
import type { User } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { username, email, password } = await req.json();

  if (!username || !email || !password) {
    return NextResponse.json({ error: 'Alle velden zijn verplicht' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Wachtwoord minimaal 6 tekens' }, { status: 400 });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return NextResponse.json({ error: 'Email of gebruikersnaam al in gebruik' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  const isFirst = !(db.prepare('SELECT id FROM users LIMIT 1').get());
  const role = isFirst ? 'admin' : 'user';

  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(username, email, hash, role);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;

  await createSession({ id: user.id, username: user.username, email: user.email, role: user.role });

  return NextResponse.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
}
