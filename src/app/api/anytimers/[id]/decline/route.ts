import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { sendPushToUser, createNotification } from '@/lib/push';
import type { Anytimer } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { id } = await params;
  const anytimer = db.prepare('SELECT * FROM anytimers WHERE id = ?').get(id) as Anytimer | undefined;

  if (!anytimer) return NextResponse.json({ error: 'Anytimer niet gevonden' }, { status: 404 });
  if (anytimer.receiver_id !== session.id) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  if (anytimer.status !== 'pending') return NextResponse.json({ error: 'Kan niet weigeren' }, { status: 400 });

  db.prepare('UPDATE anytimers SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', id);

  const message = `${session.username} heeft het anytimer verzoek afgewezen.`;
  createNotification(anytimer.giver_id, 'anytimer_declined', message, anytimer.id);

  await sendPushToUser(anytimer.giver_id, {
    title: '❌ Anytimer afgewezen',
    body: message,
    data: { url: '/dashboard' },
  });

  return NextResponse.json({ ok: true });
}
