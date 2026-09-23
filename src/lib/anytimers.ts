import db from './db';
import { sendPushToUser, createNotification } from './push';
import { notifyAnyAccepted } from './whatsapp/notifications';
import type { Anytimer } from './db';

/** Naam zoals die overal in de app getoond wordt: volledige naam, of anders de username. */
export function getUserDisplayName(userId: number): string {
  const row = db.prepare(
    `SELECT CASE WHEN first_name != '' THEN first_name || ' ' || last_name ELSE username END AS name FROM users WHERE id = ?`
  ).get(userId) as { name: string } | undefined;
  return row?.name ?? 'Iemand';
}

export function getAnytimer(id: string | number): Anytimer | undefined {
  return db.prepare('SELECT * FROM anytimers WHERE id = ?').get(id) as Anytimer | undefined;
}

/** Meerdere any's tegelijk opzoeken — voor de batch-linkjes waarmee je ze in één keer accepteert/weigert. */
export function getAnytimers(ids: (string | number)[]): Anytimer[] {
  return ids
    .map(id => getAnytimer(id))
    .filter((a): a is Anytimer => a !== undefined);
}

/**
 * Wie een pending any moet bevestigen — altijd de partij die 'm NIET heeft
 * aangemaakt. Je kunt een any nu net zo goed vastleggen als ontvanger ("ik heb
 * er een van X gekregen") als als gever, het maakt niet uit wie 'm in de app
 * zet — de ander bevestigt of weigert 'm.
 */
export function getConfirmerId(a: Pick<Anytimer, 'giver_id' | 'receiver_id' | 'created_by'>): number {
  const createdBy = a.created_by ?? a.giver_id;
  return createdBy === a.giver_id ? a.receiver_id : a.giver_id;
}

/**
 * Zet een pending any op 'active' en licht de gever in — gedeeld tussen de
 * ingelogde en de token-flow. De WHERE-clause herbevestigt status = 'pending'
 * zodat een dubbele/gelijktijdige aanroep (dubbele klik, retry) 'm niet twee
 * keer verwerkt. Geeft false terug als er niks meer te doen was.
 */
export async function acceptAnytimer(anytimer: Anytimer): Promise<boolean> {
  const result = db.prepare("UPDATE anytimers SET status = 'active' WHERE id = ? AND status = 'pending'").run(anytimer.id);
  if (result.changes === 0) return false;

  const receiverName = getUserDisplayName(anytimer.receiver_id);
  const message = `${receiverName} heeft jouw anytimer verzoek geaccepteerd!`;
  createNotification(anytimer.giver_id, 'anytimer_accepted', message, anytimer.id);

  await sendPushToUser(anytimer.giver_id, {
    title: 'Anytimer geaccepteerd',
    body: message,
    data: { url: '/dashboard' },
  });

  notifyAnyAccepted(anytimer.giver_id, receiverName, anytimer.reason, anytimer.id).catch(() => {});
  return true;
}

/**
 * Zet een pending any op 'declined' (geweigerd, telt niet mee in de stats) en
 * licht de gever in. Zie acceptAnytimer voor de status='pending' guard.
 */
export async function declineAnytimer(anytimer: Anytimer): Promise<boolean> {
  const result = db.prepare("UPDATE anytimers SET status = 'declined', resolved_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'").run(anytimer.id);
  if (result.changes === 0) return false;

  const receiverName = getUserDisplayName(anytimer.receiver_id);
  const message = `${receiverName} heeft het anytimer verzoek afgewezen.`;
  createNotification(anytimer.giver_id, 'anytimer_declined', message, anytimer.id);

  await sendPushToUser(anytimer.giver_id, {
    title: 'Anytimer afgewezen',
    body: message,
    data: { url: '/dashboard' },
  });
  return true;
}

/**
 * Batch-variant van acceptAnytimer — voor het gedeelde linkje waarmee je een
 * hele set any's (van dezelfde gever/ontvanger) in één keer accepteert. Elke
 * any blijft z'n eigen rij (telt apart mee in de stats), maar de gever krijgt
 * daarover één gebundeld berichtje in plaats van eentje per any. Geeft het
 * aantal daadwerkelijk gewijzigde rijen terug (0 als alles al beantwoord was).
 */
export async function acceptAnytimerBatch(anytimers: Anytimer[]): Promise<number> {
  if (anytimers.length === 0) return 0;
  const ids = anytimers.map(a => a.id);
  const result = db.prepare(`UPDATE anytimers SET status = 'active' WHERE status = 'pending' AND id IN (${ids.map(() => '?').join(',')})`).run(...ids);
  if (result.changes === 0) return 0;

  const first = anytimers[0];
  const count = result.changes;
  const receiverName = getUserDisplayName(first.receiver_id);
  const message = count > 1
    ? `${receiverName} heeft ${count} van jouw anytimer verzoeken geaccepteerd!`
    : `${receiverName} heeft jouw anytimer verzoek geaccepteerd!`;
  createNotification(first.giver_id, 'anytimer_accepted', message, first.id);

  await sendPushToUser(first.giver_id, {
    title: 'Anytimer geaccepteerd',
    body: message,
    data: { url: '/dashboard' },
  });

  notifyAnyAccepted(first.giver_id, receiverName, first.reason, first.id, count).catch(() => {});
  return count;
}

/** Batch-variant van declineAnytimer, zie acceptAnytimerBatch. */
export async function declineAnytimerBatch(anytimers: Anytimer[]): Promise<number> {
  if (anytimers.length === 0) return 0;
  const ids = anytimers.map(a => a.id);
  const result = db.prepare(`UPDATE anytimers SET status = 'declined', resolved_at = CURRENT_TIMESTAMP WHERE status = 'pending' AND id IN (${ids.map(() => '?').join(',')})`).run(...ids);
  if (result.changes === 0) return 0;

  const first = anytimers[0];
  const count = result.changes;
  const receiverName = getUserDisplayName(first.receiver_id);
  const message = count > 1
    ? `${receiverName} heeft ${count} anytimer verzoeken afgewezen.`
    : `${receiverName} heeft het anytimer verzoek afgewezen.`;
  createNotification(first.giver_id, 'anytimer_declined', message, first.id);

  await sendPushToUser(first.giver_id, {
    title: 'Anytimer afgewezen',
    body: message,
    data: { url: '/dashboard' },
  });
  return count;
}
