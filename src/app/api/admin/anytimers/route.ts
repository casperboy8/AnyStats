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

  const { giver_id, receiver_id, reason, status } = await req.json();
  if (!giver_id || !receiver_id || !reason) {
    return NextResponse.json({ error: 'Gever, ontvanger en reden verplicht' }, { status: 400 });
  }

  const result = db.prepare(
    'INSERT INTO anytimers (giver_id, receiver_id, reason, status) VALUES (?, ?, ?, ?)'
  ).run(giver_id, receiver_id, reason, status || 'active');

  return NextResponse.json({ ok: true, id: result.lastInsertRowid });
}
