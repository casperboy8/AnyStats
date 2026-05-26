import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { sendPushToUser, createNotification } from '@/lib/push';
import type { Anytimer } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { id } = await params;
  const { goed } = await req.json(); // true = gedronken, false = geweigerd

  const anytimer = db.prepare('SELECT * FROM anytimers WHERE id = ?').get(id) as Anytimer | undefined;

  if (!anytimer) return NextResponse.json({ error: 'Anytimer niet gevonden' }, { status: 404 });
  if (anytimer.giver_id !== session.id) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  if (anytimer.status !== 'inzetten_pending') return NextResponse.json({ error: 'Niet in afwachting' }, { status: 400 });

  if (goed) {
    db.prepare(
      'UPDATE anytimers SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run('completed', id);

    const message = `Anytimer gedronken! Goed gedaan. 🍻`;
    createNotification(anytimer.receiver_id, 'anytimer_completed', message, anytimer.id);
    await sendPushToUser(anytimer.receiver_id, {
      title: '✅ Anytimer voltooid',
      body: message,
      data: { url: '/dashboard' },
    });
  } else {
    // Geweigerd: zet anytimer terug op actief + voeg straf-anytimer toe
    db.prepare('UPDATE anytimers SET status = ? WHERE id = ?').run('active', id);

    const penaltyResult = db.prepare(
      'INSERT INTO anytimers (giver_id, receiver_id, reason, status) VALUES (?, ?, ?, ?)'
    ).run(session.id, anytimer.receiver_id, `Straf: geweigerde anytimer (${anytimer.reason})`, 'active');

    const receiverUser = db.prepare('SELECT username FROM users WHERE id = ?').get(anytimer.receiver_id) as { username: string };
    const message = `${receiverUser.username} heeft geweigerd! Originele anytimer blijft + 1 straf-anytimer erbij. 😤`;
    createNotification(session.id, 'anytimer_refused', message, anytimer.id);

    const receiverMsg = `Je hebt een anytimer geweigerd. Je krijgt een extra straf-anytimer!`;
    createNotification(anytimer.receiver_id, 'anytimer_refused_penalty', receiverMsg, penaltyResult.lastInsertRowid as number);
    await sendPushToUser(anytimer.receiver_id, {
      title: '😤 Straf-anytimer!',
      body: receiverMsg,
      data: { url: '/dashboard' },
    });
  }

  return NextResponse.json({ ok: true });
}
