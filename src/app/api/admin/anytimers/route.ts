import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const anytimers = db.prepare(`
    SELECT a.*,
      u_giver.username AS giver_username,
      u_receiver.username AS receiver_username
    FROM anytimers a
    JOIN users u_giver ON a.giver_id = u_giver.id
    JOIN users u_receiver ON a.receiver_id = u_receiver.id
    ORDER BY a.created_at DESC
  `).all();

  return NextResponse.json(anytimers);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { giver_id, receiver_id, reason, status, organisation_id } = await req.json();
  if (!giver_id || !receiver_id || !reason) {
    return NextResponse.json({ error: 'Gever, ontvanger en reden verplicht' }, { status: 400 });
  }

  // Gebruik de meegegeven org of zoek automatisch een gedeelde
  let orgId: string | null = organisation_id ?? null;
  if (!orgId) {
    const sharedOrg = db.prepare(`
      SELECT om1.organisation_id
      FROM organisation_members om1
      JOIN organisation_members om2 ON om1.organisation_id = om2.organisation_id
      WHERE om1.user_id = ? AND om2.user_id = ?
      LIMIT 1
    `).get(giver_id, receiver_id) as { organisation_id: string } | undefined;
    orgId = sharedOrg?.organisation_id ?? null;
  }

  const result = db.prepare(
    'INSERT INTO anytimers (giver_id, receiver_id, reason, status, organisation_id) VALUES (?, ?, ?, ?, ?)'
  ).run(giver_id, receiver_id, reason, status || 'active', orgId);

  return NextResponse.json({ ok: true, id: result.lastInsertRowid });
}
