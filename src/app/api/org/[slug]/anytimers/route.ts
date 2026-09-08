import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership } from '@/lib/org';
import { sendPushToUser, createNotification } from '@/lib/push';
import { notifyAnyPendingConfirmation } from '@/lib/whatsapp/notifications';
import { createAnytimerToken } from '@/lib/anytimer-token';
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
      CASE WHEN u_giver.first_name != '' THEN u_giver.first_name || ' ' || u_giver.last_name ELSE u_giver.username END AS giver_username,
      CASE WHEN u_receiver.first_name != '' THEN u_receiver.first_name || ' ' || u_receiver.last_name ELSE u_receiver.username END AS receiver_username,
      CASE WHEN COALESCE(a.created_by, a.giver_id) = a.giver_id THEN a.receiver_id ELSE a.giver_id END AS confirmer_id
    FROM anytimers a
    JOIN users u_giver ON a.giver_id = u_giver.id
    JOIN users u_receiver ON a.receiver_id = u_receiver.id
    WHERE (a.giver_id = ? OR a.receiver_id = ?)
      AND a.status != 'completed'
      AND EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = ? AND user_id = a.giver_id)
      AND EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = ? AND user_id = a.receiver_id)
    ORDER BY a.created_at DESC
  `).all(session.id, session.id, org.id, org.id);

  return NextResponse.json(anytimers);
}

/**
 * Maakt niet uit wie van de twee 'm in de app zet: `direction: 'given'`
 * betekent jij bent de gever (counterpart moet bevestigen als ontvanger),
 * `direction: 'received'` betekent jij hebt 'm ontvangen (counterpart moet
 * bevestigen als gever).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const membership = getOrgMembership(org.id, session.id);
  if (!membership) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { counterpart_id, reason, direction } = await req.json();
  if (!counterpart_id || !reason?.trim()) return NextResponse.json({ error: 'Persoon en reden verplicht' }, { status: 400 });
  if (counterpart_id === session.id) return NextResponse.json({ error: 'Je kunt geen anytimer op jezelf zetten' }, { status: 400 });
  if (direction !== 'given' && direction !== 'received') return NextResponse.json({ error: 'Ongeldige richting' }, { status: 400 });

  // Counterpart moet ook lid zijn van de org
  const counterpartMembership = getOrgMembership(org.id, counterpart_id);
  if (!counterpartMembership) return NextResponse.json({ error: 'Deze gebruiker is geen lid van deze organisatie' }, { status: 400 });

  const counterpart = db.prepare(`SELECT id, CASE WHEN first_name != '' THEN first_name || ' ' || last_name ELSE username END AS username FROM users WHERE id = ?`).get(counterpart_id) as { id: number; username: string } | undefined;
  if (!counterpart) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 });

  const giverId = direction === 'given' ? session.id : counterpart_id;
  const receiverId = direction === 'given' ? counterpart_id : session.id;

  const result = db.prepare(
    'INSERT INTO anytimers (giver_id, receiver_id, reason, status, organisation_id, created_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(giverId, receiverId, reason.trim(), 'pending', org.id, session.id);

  const anytimerId = result.lastInsertRowid as number;
  const message = direction === 'given'
    ? `${session.username} wil je een anytimer geven: "${reason.trim()}"`
    : `${session.username} zegt dat jij hem/haar een anytimer hebt gegeven: "${reason.trim()}"`;
  createNotification(counterpart_id, direction === 'given' ? 'anytimer_request' : 'anytimer_claim', message, anytimerId);
  await sendPushToUser(counterpart_id, {
    title: direction === 'given' ? 'Anytimer verzoek' : 'Anytimer bevestigen',
    body: message,
    data: { url: `/org/${slug}` },
  });

  // WhatsApp — fire-and-forget; token laat de counterpart bevestigen/weigeren zonder in te loggen
  const token = createAnytimerToken(anytimerId);
  notifyAnyPendingConfirmation(counterpart_id, session.username, reason.trim(), anytimerId, token, direction === 'given' ? 'receiver' : 'giver').catch(() => {});

  return NextResponse.json({ ok: true, id: anytimerId });
}
