import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createSession } from '@/lib/auth';
import { getUserOrgs } from '@/lib/org';
import type { User } from '@/lib/db';

export async function POST(req: NextRequest) {
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
    const invite = db.prepare(`
      SELECT i.*, o.slug AS org_slug FROM organisation_invites i
      JOIN organisations o ON o.id = i.organisation_id
      WHERE i.code = ?
    `).get(invite_code) as ({ org_slug: string; organisation_id: string; role: string; id: string; expires_at: string | null; max_uses: number | null; use_count: number } | undefined);

    if (invite && !(invite.expires_at && new Date(invite.expires_at) < new Date())
        && !(invite.max_uses !== null && invite.use_count >= invite.max_uses)) {
      const { randomUUID } = await import('crypto');
      const { getOrgMembership } = await import('@/lib/org');
      if (!getOrgMembership(invite.organisation_id, user.id)) {
        db.prepare('INSERT INTO organisation_members (id, organisation_id, user_id, role) VALUES (?, ?, ?, ?)').run(
          randomUUID(), invite.organisation_id, user.id, invite.role
        );
        db.prepare('UPDATE organisation_invites SET use_count = use_count + 1 WHERE id = ?').run(invite.id);
      }
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
