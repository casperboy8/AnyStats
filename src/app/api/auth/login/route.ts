import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createSession } from '@/lib/auth';
import type { User } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email en wachtwoord verplicht' }, { status: 400 });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: 'Onjuiste gegevens' }, { status: 401 });
  }

  await createSession({ id: user.id, username: user.username, email: user.email, role: user.role });

  return NextResponse.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
}
