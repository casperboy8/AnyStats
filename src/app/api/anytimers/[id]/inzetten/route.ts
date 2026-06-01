import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { sendPushToUser, createNotification } from '@/lib/push';
import { notifyAnyIngezet } from '@/lib/whatsapp/notifications';
import type { Anytimer } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { id } = await params;
  const anytimer = db.prepare('SELECT * FROM anytimers WHERE id = ?').get(id) as Anytimer | undefined;

  if (!anytimer) return NextResponse.json({ error: 'Anytimer niet gevonden' }, { status: 404 });
  if (anytimer.giver_id !== session.id) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  if (anytimer.status !== 'active') return NextResponse.json({ error: 'Anytimer niet actief' }, { status: 400 });

  db.prepare(
    'UPDATE anytimers SET status = ?, activated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run('inzetten_pending', id);

  const message = `${session.username} zet een anytimer op jou in.`;
  createNotification(anytimer.receiver_id, 'anytimer_ingezet', message, anytimer.id);

  await sendPushToUser(anytimer.receiver_id, {
    title: 'Anytimer ingezet',
    body: message,
    data: { url: '/dashboard', anytimerId: anytimer.id },
  });

  // WhatsApp — fire-and-forget
  notifyAnyIngezet(anytimer.receiver_id, session.username, anytimer.reason, anytimer.id).catch(() => {});

  return NextResponse.json({ ok: true });
}
