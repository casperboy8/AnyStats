import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { sendPushToUser, createNotification } from '@/lib/push';
import { notifyAnyReceived } from '@/lib/whatsapp/notifications';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const myAnytimers = db.prepare(`
    SELECT a.*,
      CASE WHEN u_giver.first_name != '' THEN u_giver.first_name || ' ' || u_giver.last_name ELSE u_giver.username END AS giver_username,
      CASE WHEN u_receiver.first_name != '' THEN u_receiver.first_name || ' ' || u_receiver.last_name ELSE u_receiver.username END AS receiver_username
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

  const { receiver_id, reason, organisation_id } = await req.json();

  if (!receiver_id || !reason?.trim()) {
    return NextResponse.json({ error: 'Ontvanger en reden verplicht' }, { status: 400 });
  }
  if (receiver_id === session.id) {
    return NextResponse.json({ error: 'Je kunt geen anytimer op jezelf zetten' }, { status: 400 });
  }

  const receiver = db.prepare(`SELECT id, CASE WHEN first_name != '' THEN first_name || ' ' || last_name ELSE username END AS username FROM users WHERE id = ?`).get(receiver_id) as { id: number; username: string } | undefined;
  if (!receiver) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 });

  // Als een org is meegegeven: giver én receiver moeten daar lid van zijn
  if (organisation_id) {
    const memberCount = (db.prepare(
      'SELECT COUNT(*) AS c FROM organisation_members WHERE organisation_id = ? AND user_id IN (?, ?)'
    ).get(organisation_id, session.id, receiver_id) as { c: number }).c;
    if (memberCount !== 2) {
      return NextResponse.json({ error: 'Beide gebruikers moeten lid zijn van de organisatie' }, { status: 403 });
    }
  }

  const result = db.prepare(
    'INSERT INTO anytimers (giver_id, receiver_id, reason, status, organisation_id) VALUES (?, ?, ?, ?, ?)'
  ).run(session.id, receiver_id, reason.trim(), 'pending', organisation_id ?? null);

  const anytimerId = result.lastInsertRowid as number;

  const message = `${session.username} wil je een anytimer geven: "${reason.trim()}"`;
  createNotification(receiver_id, 'anytimer_request', message, anytimerId);

  await sendPushToUser(receiver_id, {
    title: 'Anytimer verzoek',
    body: message,
    data: { url: '/dashboard', anytimerId },
  });

  // WhatsApp-notificatie — fire-and-forget, breekt nooit de response
  let orgName = 'AnyStats';
  let orgSlug: string | null = null;
  if (organisation_id) {
    const org = db.prepare('SELECT name, slug FROM organisations WHERE id = ?').get(organisation_id) as { name: string; slug: string } | undefined;
    if (org) { orgName = org.name; orgSlug = org.slug; }
  }
  notifyAnyReceived(receiver_id, session.username, reason.trim(), orgName, anytimerId, orgSlug).catch(() => {});

  return NextResponse.json({ ok: true, id: anytimerId });
}
