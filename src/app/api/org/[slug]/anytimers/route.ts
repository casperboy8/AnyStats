import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership } from '@/lib/org';
import { sendPushToUser, createNotification } from '@/lib/push';
import { notifyAnyReceived } from '@/lib/whatsapp/notifications';
import type { Organisation } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const membership = getOrgMembership(org.id, session.id);
  if (!membership) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const anytimers = db.prepare(`
    SELECT a.*,
      u_giver.username AS giver_username,
      u_receiver.username AS receiver_username
    FROM anytimers a
    JOIN users u_giver ON a.giver_id = u_giver.id
    JOIN users u_receiver ON a.receiver_id = u_receiver.id
    WHERE a.organisation_id = ?
      AND (a.giver_id = ? OR a.receiver_id = ?)
      AND a.status != 'completed'
    ORDER BY a.created_at DESC
  `).all(org.id, session.id, session.id);

  return NextResponse.json(anytimers);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const membership = getOrgMembership(org.id, session.id);
  if (!membership) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { receiver_id, reason } = await req.json();
  if (!receiver_id || !reason?.trim()) return NextResponse.json({ error: 'Ontvanger en reden verplicht' }, { status: 400 });
  if (receiver_id === session.id) return NextResponse.json({ error: 'Je kunt geen anytimer op jezelf zetten' }, { status: 400 });

  // Ontvanger moet ook lid zijn van de org
  const receiverMembership = getOrgMembership(org.id, receiver_id);
  if (!receiverMembership) return NextResponse.json({ error: 'Ontvanger is geen lid van deze organisatie' }, { status: 400 });

  const receiver = db.prepare('SELECT id, username FROM users WHERE id = ?').get(receiver_id) as { id: number; username: string } | undefined;
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
    data: { url: `/org/${slug}` },
  });

  // WhatsApp — fire-and-forget
  notifyAnyReceived(receiver_id, session.username, reason.trim(), org.name, anytimerId, org.slug).catch(() => {});

  return NextResponse.json({ ok: true, id: anytimerId });
}
