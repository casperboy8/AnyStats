import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getSharedOrgId } from '@/lib/org';
import { sendPushToUser, createNotification } from '@/lib/push';
import { notifyAnyReceived } from '@/lib/whatsapp/notifications';
import { createAnytimerToken } from '@/lib/anytimer-token';
import type { Organisation } from '@/lib/db';

/** Al jouw openstaande any's, over al je groepen heen gecombineerd. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const anytimers = db.prepare(`
    SELECT a.*,
      CASE WHEN u_giver.first_name != '' THEN u_giver.first_name || ' ' || u_giver.last_name ELSE u_giver.username END AS giver_username,
      CASE WHEN u_receiver.first_name != '' THEN u_receiver.first_name || ' ' || u_receiver.last_name ELSE u_receiver.username END AS receiver_username
    FROM anytimers a
    JOIN users u_giver    ON a.giver_id    = u_giver.id
    JOIN users u_receiver ON a.receiver_id = u_receiver.id
    WHERE (a.giver_id = ? OR a.receiver_id = ?)
      AND a.status != 'completed'
    ORDER BY a.created_at DESC
  `).all(session.id, session.id);

  return NextResponse.json(anytimers);
}

/**
 * Any geven aan iemand met wie je minstens 1 groep deelt — niet gebonden aan
 * één specifieke groep. organisation_id wordt gevuld met een gedeelde groep
 * (voor bestaande notificatie-links), maar telt nergens meer mee in stats.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { receiver_id, reason } = await req.json();
  if (!receiver_id || !reason?.trim()) return NextResponse.json({ error: 'Ontvanger en reden verplicht' }, { status: 400 });
  if (receiver_id === session.id) return NextResponse.json({ error: 'Je kunt geen anytimer op jezelf zetten' }, { status: 400 });

  const orgId = getSharedOrgId(session.id, receiver_id);
  if (!orgId) return NextResponse.json({ error: 'Je deelt geen groep met deze gebruiker' }, { status: 400 });
  const org = db.prepare('SELECT * FROM organisations WHERE id = ?').get(orgId) as Organisation;

  const receiver = db.prepare(`SELECT id, CASE WHEN first_name != '' THEN first_name || ' ' || last_name ELSE username END AS username FROM users WHERE id = ?`).get(receiver_id) as { id: number; username: string } | undefined;
  if (!receiver) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 });

  const result = db.prepare(
    'INSERT INTO anytimers (giver_id, receiver_id, reason, status, organisation_id) VALUES (?, ?, ?, ?, ?)'
  ).run(session.id, receiver_id, reason.trim(), 'pending', org.id);

  const anytimerId = result.lastInsertRowid as number;
  const message = `${session.username} wil je een anytimer geven: "${reason.trim()}"`;
  createNotification(receiver_id, 'anytimer_request', message, anytimerId);
  await sendPushToUser(receiver_id, {
    title: 'Anytimer verzoek',
    body: message,
    data: { url: `/dashboard` },
  });

  // WhatsApp — fire-and-forget; token laat de ontvanger accepteren/weigeren zonder in te loggen
  const token = createAnytimerToken(anytimerId);
  notifyAnyReceived(receiver_id, session.username, reason.trim(), anytimerId, token).catch(() => {});

  return NextResponse.json({ ok: true, id: anytimerId });
}
