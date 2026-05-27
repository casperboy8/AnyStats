import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import type { Organisation } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;

  const org = db
    .prepare('SELECT * FROM organisations WHERE slug = ?')
    .get(slug) as Organisation | undefined;

  if (!org) return NextResponse.json({ error: 'Groep niet gevonden' }, { status: 404 });

  // Controleer lidmaatschap
  const isMember = db
    .prepare('SELECT 1 FROM organisation_members WHERE organisation_id = ? AND user_id = ?')
    .get(org.id, session.id);
  if (!isMember) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const stats = db.prepare(`
    SELECT
      u.id,
      u.username,
      COUNT(CASE WHEN a.giver_id    = u.id AND a.status NOT IN ('completed','pending') THEN 1 END) AS gegeven_actief,
      COUNT(CASE WHEN a.receiver_id = u.id AND a.status NOT IN ('completed','pending') THEN 1 END) AS ontvangen_actief,
      COUNT(CASE WHEN a.giver_id    = u.id AND a.status = 'completed' THEN 1 END) AS gegeven_totaal,
      COUNT(CASE WHEN a.receiver_id = u.id AND a.status = 'completed' THEN 1 END) AS ontvangen_totaal
    FROM users u
    JOIN organisation_members om ON om.user_id = u.id AND om.organisation_id = ?
    LEFT JOIN anytimers a ON (a.giver_id = u.id OR a.receiver_id = u.id)
    GROUP BY u.id
    ORDER BY ontvangen_actief DESC, ontvangen_totaal DESC
  `).all(org.id);

  return NextResponse.json(stats);
}
