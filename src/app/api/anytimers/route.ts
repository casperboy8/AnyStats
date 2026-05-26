import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { sendPushToUser, createNotification } from '@/lib/push';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const myAnytimers = db.prepare(`
    SELECT a.*,
      u_giver.username AS giver_username,
      u_receiver.username AS receiver_username
    FROM anytimers a
    JOIN users u_giver ON a.giver_id = u_giver.id
    JOIN users u_receiver ON a.receiver_id = u_receiver.id
    WHERE (a.giver_id = ? OR a.receiver_id = ?)
      AND a.status != 'completed'
    ORDER BY a.created_at DESC
  `).all(session.id, session.id);

  return NextResponse.json(myAnytimers);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { receiver_id, reason } = await req.json();

  if (!receiver_id || !reason?.trim()) {
    return NextResponse.json({ error: 'Ontvanger en reden verplicht' }, { status: 400 });
  }
  if (receiver_id === session.id) {
    return NextResponse.json({ error: 'Je kunt geen anytimer op jezelf zetten' }, { status: 400 });
  }

  const receiver = db.prepare('SELECT id, username FROM users WHERE id = ?').get(receiver_id) as { id: number; username: string } | undefined;
  if (!receiver) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 });

  const result = db.prepare(
    'INSERT INTO anytimers (giver_id, receiver_id, reason, status) VALUES (?, ?, ?, ?)'
  ).run(session.id, receiver_id, reason.trim(), 'pending');

  const anytimerId = result.lastInsertRowid as number;

  const message = `${session.username} wil je een anytimer geven: "${reason.trim()}"`;
  createNotification(receiver_id, 'anytimer_request', message, anytimerId);

  await sendPushToUser(receiver_id, {
    title: 'Anytimer verzoek',
    body: message,
    data: { url: '/dashboard', anytimerId },
  });

  return NextResponse.json({ ok: true, id: anytimerId });
}
