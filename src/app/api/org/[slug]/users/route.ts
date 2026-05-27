import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership } from '@/lib/org';
import type { Organisation } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const membership = getOrgMembership(org.id, session.id);
  if (!membership) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const members = db.prepare(`
    SELECT u.id, u.username
    FROM users u
    JOIN organisation_members om ON om.user_id = u.id
    WHERE om.organisation_id = ?
    ORDER BY u.username
  `).all(org.id) as { id: number; username: string }[];

  return NextResponse.json(members);
}
