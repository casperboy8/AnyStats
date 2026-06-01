import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership } from '@/lib/org';
import { notifyAddedToOrg } from '@/lib/whatsapp/notifications';
import type { Organisation, OrganisationInvite } from '@/lib/db';
import { randomUUID } from 'crypto';

type InviteWithOrg = OrganisationInvite & { org_name: string; org_slug: string };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const invite = db.prepare(`
    SELECT i.*, o.name AS org_name, o.slug AS org_slug
    FROM organisation_invites i
    JOIN organisations o ON o.id = i.organisation_id
    WHERE i.code = ?
  `).get(code) as InviteWithOrg | undefined;

  if (!invite) return NextResponse.json({ error: 'Ongeldige koppelcode' }, { status: 404 });

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Deze koppelcode is verlopen' }, { status: 410 });
  }
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return NextResponse.json({ error: 'Deze koppelcode is al maximaal gebruikt' }, { status: 410 });
  }

  return NextResponse.json({
    org_name: invite.org_name,
    org_slug: invite.org_slug,
    role: invite.role,
    code: invite.code,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { code } = await params;

  const invite = db.prepare(`
    SELECT i.*, o.name AS org_name, o.slug AS org_slug
    FROM organisation_invites i
    JOIN organisations o ON o.id = i.organisation_id
    WHERE i.code = ?
  `).get(code) as InviteWithOrg | undefined;

  if (!invite) return NextResponse.json({ error: 'Ongeldige koppelcode' }, { status: 404 });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Deze koppelcode is verlopen' }, { status: 410 });
  }
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return NextResponse.json({ error: 'Deze koppelcode is al maximaal gebruikt' }, { status: 410 });
  }

  const existing = getOrgMembership(invite.organisation_id, session.id);
  if (existing) {
    return NextResponse.json({ ok: true, slug: invite.org_slug, already_member: true });
  }

  db.prepare(`
    INSERT INTO organisation_members (id, organisation_id, user_id, role)
    VALUES (?, ?, ?, ?)
  `).run(randomUUID(), invite.organisation_id, session.id, invite.role);

  db.prepare(`
    UPDATE organisation_invites SET use_count = use_count + 1 WHERE id = ?
  `).run(invite.id);

  notifyAddedToOrg(session.id, invite.org_name, invite.role, invite.org_slug).catch(() => {});

  return NextResponse.json({ ok: true, slug: invite.org_slug });
}
