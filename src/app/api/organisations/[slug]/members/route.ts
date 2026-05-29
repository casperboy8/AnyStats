import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership, hasMinRole } from '@/lib/org';
import { allowedRolesToAssign } from '@/lib/permissions';
import { notifyAddedToOrg } from '@/lib/whatsapp/notifications';
import type { Organisation } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const isSuperAdmin = session.role === 'admin';
  const membership = getOrgMembership(org.id, session.id);
  if (!membership && !isSuperAdmin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const members = db.prepare(`
    SELECT om.id, om.role, om.joined_at, u.id AS user_id, u.username, u.email
    FROM organisation_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.organisation_id = ?
    ORDER BY om.role DESC, u.username
  `).all(org.id);

  return NextResponse.json(members);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const isSuperAdmin = session.role === 'admin';
  const myMembership = getOrgMembership(org.id, session.id);
  // Minimaal admin nodig om leden toe te voegen (of super admin)
  if (!isSuperAdmin && (!myMembership || !hasMinRole(myMembership, 'admin'))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const { username, role = 'member' } = await req.json();
  if (!username?.trim()) return NextResponse.json({ error: 'Gebruikersnaam is verplicht' }, { status: 400 });

  // Super admins mogen elke rol toewijzen; anderen zijn beperkt
  if (!isSuperAdmin) {
    const allowed = allowedRolesToAssign(myMembership!);
    if (!allowed.includes(role)) {
      return NextResponse.json(
        { error: `Jij mag alleen de rol '${allowed.join("' of '")}' toewijzen` },
        { status: 403 }
      );
    }
  }

  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim()) as { id: number } | undefined;
  if (!user) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 });

  const existing = getOrgMembership(org.id, user.id);
  if (existing) return NextResponse.json({ error: 'Gebruiker is al lid' }, { status: 409 });

  db.prepare('INSERT INTO organisation_members (id, organisation_id, user_id, role) VALUES (?, ?, ?, ?)').run(
    randomUUID(), org.id, user.id, role
  );

  // WhatsApp-notificatie voor het toegevoegde lid — fire-and-forget
  notifyAddedToOrg(user.id, org.name, role).catch(() => {});

  return NextResponse.json({ ok: true });
}
