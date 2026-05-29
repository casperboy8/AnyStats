import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership } from '@/lib/org';
import { canChangeRole, canRemoveMember } from '@/lib/permissions';
import type { Organisation, OrganisationMember } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; userId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug, userId } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const isSuperAdmin = session.role === 'admin';
  const myMembership = getOrgMembership(org.id, session.id);
  if (!myMembership && !isSuperAdmin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  // Alleen owner of super admin mag rollen wijzigen
  if (!isSuperAdmin && (!myMembership || !canChangeRole(myMembership))) {
    return NextResponse.json({ error: 'Alleen owners mogen rollen wijzigen' }, { status: 403 });
  }

  const { role } = await req.json();
  if (!['owner', 'admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Ongeldige rol' }, { status: 400 });
  }

  const targetMembership = getOrgMembership(org.id, Number(userId));
  if (!targetMembership) return NextResponse.json({ error: 'Lid niet gevonden' }, { status: 404 });

  // Voorkom dat de laatste owner zijn eigen owner-rol weggeeft
  if (targetMembership.role === 'owner' && role !== 'owner') {
    const ownerCount = (db.prepare(
      "SELECT COUNT(*) as c FROM organisation_members WHERE organisation_id = ? AND role = 'owner'"
    ).get(org.id) as { c: number }).c;
    if (ownerCount <= 1) {
      return NextResponse.json({ error: 'Kan de laatste owner niet degraderen' }, { status: 400 });
    }
  }

  db.prepare('UPDATE organisation_members SET role = ? WHERE organisation_id = ? AND user_id = ?')
    .run(role, org.id, Number(userId));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; userId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug, userId } = await params;
  const targetId = Number(userId);

  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const isSuperAdminDel = session.role === 'admin';
  const myMembership = getOrgMembership(org.id, session.id);
  if (!myMembership && !isSuperAdminDel) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const targetMembership = getOrgMembership(org.id, targetId) as OrganisationMember | undefined;
  if (!targetMembership) return NextResponse.json({ error: 'Lid niet gevonden' }, { status: 404 });

  const isSelf = session.id === targetId;
  if (!isSelf && !isSuperAdminDel && (!myMembership || !canRemoveMember(myMembership, targetMembership))) {
    return NextResponse.json({ error: 'Geen toegang om dit lid te verwijderen' }, { status: 403 });
  }

  // Voorkom verwijderen van de laatste owner
  if (targetMembership.role === 'owner') {
    const ownerCount = (db.prepare(
      "SELECT COUNT(*) as c FROM organisation_members WHERE organisation_id = ? AND role = 'owner'"
    ).get(org.id) as { c: number }).c;
    if (ownerCount <= 1) {
      return NextResponse.json({ error: 'Kan de laatste owner niet verwijderen' }, { status: 400 });
    }
  }

  db.prepare('DELETE FROM organisation_members WHERE organisation_id = ? AND user_id = ?').run(org.id, targetId);

  return NextResponse.json({ ok: true });
}
