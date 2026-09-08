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

  // Groepen bepalen alleen wie er op déze lijst staat — de stats zelf zijn
  // altijd globaal (over al iemands groepen heen), niet per groep geteld.
  const stats = db.prepare(`
    SELECT
      u.id,
      CASE WHEN u.first_name != '' THEN u.first_name || ' ' || u.last_name ELSE u.username END AS username,
      (SELECT COUNT(*) FROM anytimers ga WHERE ga.giver_id    = u.id AND ga.status NOT IN ('completed','pending')) AS gegeven_actief,
      (SELECT COUNT(*) FROM anytimers ga WHERE ga.receiver_id = u.id AND ga.status NOT IN ('completed','pending')) AS ontvangen_actief,
      (SELECT COUNT(*) FROM anytimers ga WHERE ga.giver_id    = u.id AND ga.status = 'completed') AS gegeven_totaal,
      (SELECT COUNT(*) FROM anytimers ga WHERE ga.receiver_id = u.id AND ga.status = 'completed') AS ontvangen_totaal,
      (SELECT COUNT(*) FROM anytimers ga WHERE ga.receiver_id = u.id AND ga.status = 'completed') AS ontvangen_totaal_global,
      (SELECT COUNT(*) FROM barf_events k WHERE k.user_id = u.id) AS barf_totaal
    FROM users u
    JOIN organisation_members om ON om.user_id = u.id AND om.organisation_id = ?
    ORDER BY ontvangen_totaal DESC, ontvangen_actief DESC
  `).all(org.id);

  return NextResponse.json(stats);
}
