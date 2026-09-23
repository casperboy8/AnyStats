import db from '@/lib/db';
import { sendWhatsappMessage } from './client';
import type { User } from '@/lib/db';

const APP_URL = process.env.APP_URL ?? 'https://anystats.nl';

async function getUserPhone(userId: number): Promise<string | null> {
  const user = db.prepare(
    'SELECT phone_number, whatsapp_notifications FROM users WHERE id = ?'
  ).get(userId) as Pick<User, 'phone_number' | 'whatsapp_notifications'> | undefined;

  if (!user?.phone_number) return null;
  if (!user.whatsapp_notifications) return null;

  return user.phone_number;
}

function getOrgSlug(anytimerId: number): string | null {
  const row = db.prepare(`
    SELECT o.slug FROM anytimers a
    JOIN organisations o ON o.id = a.organisation_id
    WHERE a.id = ?
  `).get(anytimerId) as { slug: string } | undefined;
  return row?.slug ?? null;
}

/**
 * Er staat een nieuwe any klaar die nog bevestigd moet worden — of dat nu is
 * omdat iemand jou een any wil GEVEN (jij bent de ontvanger/drinker), of omdat
 * iemand zegt dat JIJ hen al een any hebt gegeven (jij bent de gever en moet
 * dat bevestigen). Groepen zijn er alleen om te bepalen wie je mag zien, any's
 * zelf zijn er niet aan gebonden, dus dit bericht noemt bewust geen groepsnaam.
 * De linkjes werken direct (via `token`), zonder dat je hoeft in te loggen.
 */
export async function notifyAnyPendingConfirmation(
  toUserId: number,
  fromUserName: string,
  reason: string,
  /** Eén of meerdere any-id's (bij meerdere any's in één keer) — delen allemaal hetzelfde `token`. */
  anytimerIds: number[],
  token: string,
  /** Rol die `toUserId` speelt in deze any — bepaalt alleen de tekst. */
  confirmerRole: 'receiver' | 'giver'
): Promise<void> {
  try {
    const phone = await getUserPhone(toUserId);
    if (!phone) return;

    const count = anytimerIds.length;
    const base = `${APP_URL}/any/${anytimerIds.join(',')}?token=${token}`;
    const countLabel = count > 1 ? `${count}x ` : '';

    const message = confirmerRole === 'receiver'
      ? `Hey! 👋 *${fromUserName}* wil je ${countLabel}een anytimer geven.\n` +
        `Reden: _"${reason}"_\n\n` +
        `✅ ${count > 1 ? 'Alles accepteren' : 'Accepteren'}: ${base}&action=accept\n` +
        `❌ ${count > 1 ? 'Alles weigeren' : 'Weigeren'}: ${base}&action=decline`
      : `Hey! 👋 *${fromUserName}* zegt dat jij hem/haar ${countLabel}een anytimer hebt gegeven.\n` +
        `Reden: _"${reason}"_\n\n` +
        `Klopt dat?\n\n` +
        `✅ ${count > 1 ? 'Alles bevestigen' : 'Bevestigen'}: ${base}&action=accept\n` +
        `❌ ${count > 1 ? 'Alles afwijzen' : 'Afwijzen'}: ${base}&action=decline`;

    await sendWhatsappMessage(phone, message);
  } catch (err) {
    console.error('[WhatsApp] notifyAnyPendingConfirmation mislukt:', err);
  }
}

/** Jouw verzoek is geaccepteerd. */
export async function notifyAnyAccepted(
  toUserId: number,
  receiverName: string,
  reason: string,
  anytimerId: number,
  /** Aantal any's dat in één keer geaccepteerd is (bij meerdere any's tegelijk). */
  count: number = 1
): Promise<void> {
  try {
    const phone = await getUserPhone(toUserId);
    if (!phone) return;

    const orgSlug = getOrgSlug(anytimerId);
    const base = orgSlug ? `${APP_URL}/org/${orgSlug}` : APP_URL;

    const message = count > 1
      ? `✅ *${receiverName}* heeft ${count} van jouw anytimers geaccepteerd!\n` +
        `_"${reason}"_\n\n` +
        `Bekijk de anytimers: ${base}`
      : `✅ *${receiverName}* heeft jouw anytimer geaccepteerd!\n` +
        `_"${reason}"_\n\n` +
        `Bekijk de anytimer: ${base}`;

    await sendWhatsappMessage(phone, message);
  } catch (err) {
    console.error('[WhatsApp] notifyAnyAccepted mislukt:', err);
  }
}

/** Anytimer ingezet — bewijs uploaden. */
export async function notifyAnyIngezet(
  toUserId: number,
  giverName: string,
  reason: string,
  anytimerId: number
): Promise<void> {
  try {
    const phone = await getUserPhone(toUserId);
    if (!phone) return;

    const orgSlug = getOrgSlug(anytimerId);
    const base = orgSlug ? `${APP_URL}/org/${orgSlug}` : APP_URL;

    const message =
      `🍺 *${giverName}* heeft de anytimer ingezet!\n` +
      `_"${reason}"_\n\n` +
      `📸 Upload je bewijs: ${base}?action=upload&id=${anytimerId}`;

    await sendWhatsappMessage(phone, message);
  } catch (err) {
    console.error('[WhatsApp] notifyAnyIngezet mislukt:', err);
  }
}

/** Gebruiker is toegevoegd aan een organisatie. */
export async function notifyAddedToOrg(
  toUserId: number,
  orgName: string,
  role: string,
  orgSlug?: string
): Promise<void> {
  try {
    const phone = await getUserPhone(toUserId);
    if (!phone) return;

    const rolLabel = role === 'owner' ? 'eigenaar' : role === 'admin' ? 'beheerder' : 'lid';
    const link = orgSlug ? `${APP_URL}/org/${orgSlug}` : APP_URL;

    const message =
      `Hey! 👋 Je bent toegevoegd aan *${orgName}* op AnyStats als *${rolLabel}*.\n` +
      `Welkom! 🎉\n\n` +
      `👉 Open de groep: ${link}`;

    await sendWhatsappMessage(phone, message);
  } catch (err) {
    console.error('[WhatsApp] notifyAddedToOrg mislukt:', err);
  }
}
