import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getNetworkUserIds, getUserOrgs } from '@/lib/org';

/**
 * Gecombineerd klassement: iedereen met wie je minstens 1 groep deelt (over al
 * je groepen heen), niet per groep gesplitst — groepen bepalen alleen wie je
 * mag zien, de stats zelf zijn altijd globaal.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const ids = [session.id, ...getNetworkUserIds(session.id)];
  const placeholders = ids.map(() => '?').join(',');

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
    WHERE u.id IN (${placeholders})
    ORDER BY ontvangen_totaal DESC, ontvangen_actief DESC
  `).all(...ids);

  const groups = getUserOrgs(session.id).map(o => ({ id: o.id, name: o.name, slug: o.slug }));

  return NextResponse.json({ stats, groups });
}
