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

/** Zet een pending any op 'active' en licht de gever in — gedeeld tussen de ingelogde en de token-flow. */
export async function acceptAnytimer(anytimer: Anytimer): Promise<void> {
  db.prepare('UPDATE anytimers SET status = ? WHERE id = ?').run('active', anytimer.id);

  const receiverName = getUserDisplayName(anytimer.receiver_id);
  const message = `${receiverName} heeft jouw anytimer verzoek geaccepteerd!`;
  createNotification(anytimer.giver_id, 'anytimer_accepted', message, anytimer.id);

  await sendPushToUser(anytimer.giver_id, {
    title: 'Anytimer geaccepteerd',
    body: message,
    data: { url: '/dashboard' },
  });

  notifyAnyAccepted(anytimer.giver_id, receiverName, anytimer.reason, anytimer.id).catch(() => {});
}

/** Zet een pending any op 'completed' (geweigerd) en licht de gever in. */
export async function declineAnytimer(anytimer: Anytimer): Promise<void> {
  db.prepare("UPDATE anytimers SET status = 'completed', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(anytimer.id);

  const receiverName = getUserDisplayName(anytimer.receiver_id);
  const message = `${receiverName} heeft het anytimer verzoek afgewezen.`;
  createNotification(anytimer.giver_id, 'anytimer_declined', message, anytimer.id);

  await sendPushToUser(anytimer.giver_id, {
    title: 'Anytimer afgewezen',
    body: message,
    data: { url: '/dashboard' },
  });
}
