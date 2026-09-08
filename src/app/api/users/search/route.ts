import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

/**
 * GET /api/users/search?q=... — gebruikers opzoeken op naam/gebruikersnaam/email.
 * Voor het "lid toevoegen"-zoekveld (super admins en org owners/admins).
 * Hoofdletter-ongevoelig, geeft maximaal 8 suggesties terug.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const isSuperAdmin = session.role === 'admin';
  const hasOrgManagementRole = !!db.prepare(
    "SELECT 1 FROM organisation_members WHERE user_id = ? AND role IN ('owner','admin') LIMIT 1"
  ).get(session.id);
  if (!isSuperAdmin && !hasOrgManagementRole) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json([]);

  const like = `%${q.toLowerCase()}%`;
  const results = db.prepare(`
    SELECT id, username,
      CASE WHEN first_name != '' THEN first_name || ' ' || last_name ELSE username END AS display_name,
      email
    FROM users
    WHERE LOWER(username) LIKE ? OR LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(email) LIKE ?
    ORDER BY display_name
    LIMIT 8
  `).all(like, like, like, like);

  return NextResponse.json(results);
}
