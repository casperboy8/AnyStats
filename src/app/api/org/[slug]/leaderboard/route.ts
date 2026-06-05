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
      COUNT(CASE WHEN a.giver_id    = u.id AND a.status NOT IN ('completed','pending') AND other_om.user_id IS NOT NULL THEN 1 END) AS gegeven_actief,
      COUNT(CASE WHEN a.receiver_id = u.id AND a.status NOT IN ('completed','pending') AND other_om.user_id IS NOT NULL THEN 1 END) AS ontvangen_actief,
      COUNT(CASE WHEN a.giver_id    = u.id AND a.status = 'completed' AND other_om.user_id IS NOT NULL THEN 1 END) AS gegeven_totaal,
      COUNT(CASE WHEN a.receiver_id = u.id AND a.status = 'completed' AND other_om.user_id IS NOT NULL THEN 1 END) AS ontvangen_totaal,
      (SELECT COUNT(*) FROM anytimers ga WHERE ga.receiver_id = u.id AND ga.status = 'completed') AS ontvangen_totaal_global
    FROM users u
    JOIN organisation_members om ON om.user_id = u.id AND om.organisation_id = ?
    LEFT JOIN anytimers a ON (a.giver_id = u.id OR a.receiver_id = u.id)
    LEFT JOIN organisation_members other_om ON
      other_om.organisation_id = ? AND
      other_om.user_id = CASE WHEN a.giver_id = u.id THEN a.receiver_id ELSE a.giver_id END
    GROUP BY u.id
    ORDER BY ontvangen_totaal DESC, ontvangen_actief DESC
  `).all(org.id, org.id);

  return NextResponse.json(stats);
}
