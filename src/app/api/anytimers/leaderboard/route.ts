import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const stats = db.prepare(`
    SELECT
      u.id,
      u.username,
      COUNT(CASE WHEN a.giver_id = u.id AND a.status NOT IN ('completed', 'pending') THEN 1 END) AS gegeven_actief,
      COUNT(CASE WHEN a.receiver_id = u.id AND a.status NOT IN ('completed', 'pending') THEN 1 END) AS ontvangen_actief,
      COUNT(CASE WHEN a.giver_id = u.id AND a.status = 'completed' THEN 1 END) AS gegeven_totaal,
      COUNT(CASE WHEN a.receiver_id = u.id AND a.status = 'completed' THEN 1 END) AS ontvangen_totaal
    FROM users u
    LEFT JOIN anytimers a ON (a.giver_id = u.id OR a.receiver_id = u.id)
    GROUP BY u.id
    ORDER BY ontvangen_actief DESC, ontvangen_totaal DESC
  `).all();

  return NextResponse.json(stats);
}
