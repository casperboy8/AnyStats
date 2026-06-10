import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createSession } from '@/lib/auth';
import { findValidInvite, redeemInvite } from '@/lib/invites';
import { normalizePhone } from '@/lib/phone';
import { checkRateLimit } from '@/lib/rate-limit';
import type { User } from '@/lib/db';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
  if (!checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Te veel registraties. Probeer het over een uur opnieuw.' }, { status: 429 });
  }

  const { username, email, password, phone_number, invite_code } = await req.json();

  if (!username || !email || !password) {
    return NextResponse.json({ error: 'Alle velden zijn verplicht' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Wachtwoord minimaal 6 tekens' }, { status: 400 });
  }

  const emailLower = email.trim().toLowerCase();
  const usernameLower = username.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?').get(emailLower, usernameLower);
  if (existing) {
    return NextResponse.json({ error: 'Email of gebruikersnaam al in gebruik' }, { status: 409 });
  }

  // Telefoonnummer normaliseren (optioneel veld)
  let normalizedPhone: string | null = null;
  if (phone_number?.trim()) {
    normalizedPhone = normalizePhone(phone_number.trim());
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Ongeldig telefoonnummer. Gebruik bijv. +31612345678 of 0612345678' },
        { status: 400 }
      );
    }
  }

  const hash = await bcrypt.hash(password, 12);
  const isFirst = !(db.prepare('SELECT id FROM users LIMIT 1').get());
  const role = isFirst ? 'admin' : 'user';

  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, role, phone_number) VALUES (?, ?, ?, ?, ?)'
  ).run(usernameLower, emailLower, hash, role, normalizedPhone);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;

  await createSession({ id: user.id, username: user.username, email: user.email, role: user.role });

  // Koppelcode verwerken
  if (invite_code) {
    const invite = findValidInvite(invite_code);
    if (invite) {
      redeemInvite(invite, user.id);
      return NextResponse.json({ ok: true, redirect: `/org/${invite.org_slug}`, user: { id: user.id, username: user.username, role: user.role } });
    }
  }

  return NextResponse.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
}
