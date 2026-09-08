import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const events = db.prepare(`
    SELECT b.id, b.user_id, b.organisation_id, b.logged_by, b.created_at,
      CASE WHEN u.first_name != '' THEN u.first_name || ' ' || u.last_name ELSE u.username END AS username,
      CASE WHEN l.first_name != '' THEN l.first_name || ' ' || l.last_name ELSE l.username END AS logged_by_username,
      o.name AS organisation_name
    FROM barf_events b
    JOIN users u ON b.user_id = u.id
    JOIN users l ON b.logged_by = l.id
    JOIN organisations o ON b.organisation_id = o.id
    ORDER BY b.created_at DESC
  `).all();

  return NextResponse.json(events);
}
