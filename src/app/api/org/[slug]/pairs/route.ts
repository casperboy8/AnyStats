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

  const isMember = db
    .prepare('SELECT 1 FROM organisation_members WHERE organisation_id = ? AND user_id = ?')
    .get(org.id, session.id);
  if (!isMember) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  // Pairwise completed anytimers between org members only
  const pairs = db.prepare(`
    SELECT
      u_giver.id   AS giver_id,
      u_giver.username AS giver_username,
      u_receiver.id AS receiver_id,
      u_receiver.username AS receiver_username,
      COUNT(*) AS count
    FROM anytimers a
    JOIN users u_giver    ON a.giver_id    = u_giver.id
    JOIN users u_receiver ON a.receiver_id = u_receiver.id
    JOIN organisation_members om_giver    ON om_giver.user_id    = a.giver_id    AND om_giver.organisation_id    = ?
    JOIN organisation_members om_receiver ON om_receiver.user_id = a.receiver_id AND om_receiver.organisation_id = ?
    WHERE a.status = 'completed'
    GROUP BY a.giver_id, a.receiver_id
    ORDER BY count DESC
  `).all(org.id, org.id);

  return NextResponse.json(pairs);
}
