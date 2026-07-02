import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const users = db.prepare(
    `SELECT id, CASE WHEN first_name != '' THEN first_name || ' ' || last_name ELSE username END AS username, email, role, created_at FROM users WHERE id != ? ORDER BY username ASC`
  ).all(session.id);

  return NextResponse.json(users);
}
