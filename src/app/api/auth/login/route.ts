import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createSession } from '@/lib/auth';
import { getUserOrgs } from '@/lib/org';
import { findValidInvite, redeemInvite } from '@/lib/invites';
import { checkRateLimit } from '@/lib/rate-limit';
import type { User } from '@/lib/db';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
  if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Te veel pogingen. Probeer het over 15 minuten opnieuw.' }, { status: 429 });
  }

  const { email, password, invite_code } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email en wachtwoord verplicht' }, { status: 400 });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as User | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: 'Onjuiste gegevens' }, { status: 401 });
  }

  await createSession({ id: user.id, username: user.username, email: user.email, role: user.role });

  // Koppelcode verwerken indien meegegeven
  if (invite_code) {
    const invite = findValidInvite(invite_code);
    if (invite) {
      redeemInvite(invite, user.id);
      return NextResponse.json({ ok: true, redirect: `/org/${invite.org_slug}` });
    }
  }

  // Bepaal redirect op basis van org-lidmaatschappen
  const orgs = getUserOrgs(user.id);
  let redirect: string;

  if (orgs.length === 0) {
    redirect = user.role === 'admin' ? '/admin' : '/no-organisation';
  } else if (orgs.length === 1) {
    redirect = `/org/${orgs[0].slug}`;
  } else if (orgs.some(o => o.role === 'owner')) {
    redirect = '/organisations';
  } else {
    redirect = '/select-org';
  }

  return NextResponse.json({ ok: true, redirect });
}
