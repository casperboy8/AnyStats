import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { sendPushToUser, createNotification } from '@/lib/push';
import type { Anytimer } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { goed } = body as { goed?: boolean };

  if (typeof goed !== 'boolean') {
    return NextResponse.json({ error: 'Veld "goed" (boolean) is verplicht' }, { status: 400 });
  }

  const anytimer = db.prepare('SELECT * FROM anytimers WHERE id = ?').get(id) as Anytimer | undefined;

  if (!anytimer) return NextResponse.json({ error: 'Anytimer niet gevonden' }, { status: 404 });
  if (anytimer.giver_id !== session.id) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  if (anytimer.status !== 'inzetten_pending') return NextResponse.json({ error: 'Niet in afwachting' }, { status: 400 });

  if (goed) {
    db.prepare(
      'UPDATE anytimers SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run('completed', id);

    const message = `Anytimer voltooid.`;
    createNotification(anytimer.receiver_id, 'anytimer_completed', message, anytimer.id);
    await sendPushToUser(anytimer.receiver_id, {
      title: 'Anytimer voltooid',
      body: message,
      data: { url: '/dashboard' },
    });
  } else {
    db.prepare('UPDATE anytimers SET status = ? WHERE id = ?').run('active', id);

    const penaltyResult = db.prepare(
      'INSERT INTO anytimers (giver_id, receiver_id, reason, status) VALUES (?, ?, ?, ?)'
    ).run(session.id, anytimer.receiver_id, `Straf: geweigerd (${anytimer.reason})`, 'active');

    const receiverUser = db.prepare('SELECT username FROM users WHERE id = ?').get(anytimer.receiver_id) as { username: string };
    const message = `${receiverUser.username} heeft geweigerd. Anytimer blijft actief + 1 extra.`;
    createNotification(session.id, 'anytimer_refused', message, anytimer.id);

    const receiverMsg = `Je hebt geweigerd. Je krijgt een extra anytimer.`;
    createNotification(anytimer.receiver_id, 'anytimer_refused_penalty', receiverMsg, penaltyResult.lastInsertRowid as number);
    await sendPushToUser(anytimer.receiver_id, {
      title: 'Extra anytimer',
      body: receiverMsg,
      data: { url: '/dashboard' },
    });
  }

  return NextResponse.json({ ok: true });
}
