import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getSharedOrgId } from '@/lib/org';

/**
 * Barf loggen voor iemand met wie je een groep deelt (of jezelf) — los van
 * welke specifieke groep, want de barf-teller zelf is altijd globaal.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: 'Gebruiker verplicht' }, { status: 400 });

  // organisation_id is verplicht in het schema, maar telt nergens meer mee —
  // we pakken gewoon een groep die jullie beiden delen.
  const orgId = getSharedOrgId(session.id, user_id);
  if (!orgId) return NextResponse.json({ error: 'Je deelt geen groep met deze gebruiker' }, { status: 400 });

  db.prepare(
    'INSERT INTO barf_events (organisation_id, user_id, logged_by) VALUES (?, ?, ?)'
  ).run(orgId, user_id, session.id);

  return NextResponse.json({ ok: true });
}
