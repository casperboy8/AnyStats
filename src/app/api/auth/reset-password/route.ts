import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { findUserByResetToken, clearResetToken } from '@/lib/password-reset';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';

  if (!checkRateLimit(`reset:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Te veel pogingen. Probeer het later opnieuw.' }, { status: 429 });
  }

  const { token, password } = await req.json();
  if (!token || !password) {
    return NextResponse.json({ error: 'Token en wachtwoord zijn verplicht' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Wachtwoord moet minimaal 6 tekens zijn' }, { status: 400 });
  }

  const user = findUserByResetToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Deze link is ongeldig of verlopen. Vraag een nieuwe aan.' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  clearResetToken(user.id);

  return NextResponse.json({ ok: true });
}
