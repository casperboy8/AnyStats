import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership } from '@/lib/org';
import type { Organisation } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const membership = getOrgMembership(org.id, session.id);
  if (!membership) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: 'Gebruiker verplicht' }, { status: 400 });

  // Gebruiker moet ook lid zijn van deze groep
  if (!getOrgMembership(org.id, user_id)) {
    return NextResponse.json({ error: 'Gebruiker is geen lid van deze organisatie' }, { status: 400 });
  }

  db.prepare(
    'INSERT INTO barf_events (organisation_id, user_id, logged_by) VALUES (?, ?, ?)'
  ).run(org.id, user_id, session.id);

  return NextResponse.json({ ok: true });
}
