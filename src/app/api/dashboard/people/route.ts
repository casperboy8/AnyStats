import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getNetworkUserIds } from '@/lib/org';

/**
 * Iedereen met wie de ingelogde gebruiker minstens 1 groep deelt, over al
 * zijn groepen heen gecombineerd (niet per groep). Groepen bepalen hier
 * alleen de zichtbaarheid — de stats zelf zijn altijd globaal.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const ids = getNetworkUserIds(session.id);
  if (ids.length === 0) return NextResponse.json([]);

  const placeholders = ids.map(() => '?').join(',');
  const people = db.prepare(`
    SELECT
      u.id,
      CASE WHEN u.first_name != '' THEN u.first_name || ' ' || u.last_name ELSE u.username END AS username,
      (SELECT COUNT(*) FROM anytimers a WHERE a.receiver_id = u.id AND a.status = 'completed') AS ontvangen_totaal_global
    FROM users u
    WHERE u.id IN (${placeholders})
    ORDER BY username
  `).all(...ids);

  return NextResponse.json(people);
}
