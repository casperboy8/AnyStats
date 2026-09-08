import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getNetworkUserIds } from '@/lib/org';

/**
 * "Wie op wie" over al je groepen gecombineerd: alle openstaande any's tussen
 * jou en iedereen met wie je een groep deelt, plus tussen die mensen onderling.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const allIds = [...getNetworkUserIds(session.id), session.id];
  if (allIds.length < 2) return NextResponse.json([]);

  const placeholders = allIds.map(() => '?').join(',');
  const pairs = db.prepare(`
    SELECT
      u_giver.id   AS giver_id,
      CASE WHEN u_giver.first_name != '' THEN u_giver.first_name || ' ' || u_giver.last_name ELSE u_giver.username END AS giver_username,
      u_receiver.id AS receiver_id,
      CASE WHEN u_receiver.first_name != '' THEN u_receiver.first_name || ' ' || u_receiver.last_name ELSE u_receiver.username END AS receiver_username,
      COUNT(*) AS count
    FROM anytimers a
    JOIN users u_giver    ON a.giver_id    = u_giver.id
    JOIN users u_receiver ON a.receiver_id = u_receiver.id
    WHERE a.status NOT IN ('completed', 'pending')
      AND a.giver_id    IN (${placeholders})
      AND a.receiver_id IN (${placeholders})
    GROUP BY a.giver_id, a.receiver_id
    ORDER BY count DESC
  `).all(...allIds, ...allIds);

  return NextResponse.json(pairs);
}
