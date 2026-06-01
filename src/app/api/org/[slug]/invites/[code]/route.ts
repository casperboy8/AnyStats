import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership, hasMinRole } from '@/lib/org';
import type { Organisation } from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; code: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug, code } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const isSuperAdmin = session.role === 'admin';
  const membership = getOrgMembership(org.id, session.id);
  if (!isSuperAdmin && (!membership || !hasMinRole(membership, 'admin'))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  db.prepare('DELETE FROM organisation_invites WHERE code = ? AND organisation_id = ?').run(code, org.id);
  return NextResponse.json({ ok: true });
}
