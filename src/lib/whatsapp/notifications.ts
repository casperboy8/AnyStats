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

/** Iemand heeft jou een anytimer gegeven — accepteren of weigeren. */
export async function notifyAnyReceived(
  toUserId: number,
  fromUserName: string,
  reason: string,
  orgName: string,
  anytimerId: number,
  orgSlug: string | null
): Promise<void> {
  try {
    const phone = await getUserPhone(toUserId);
    if (!phone) return;

    const base = orgSlug ? `${APP_URL}/org/${orgSlug}` : APP_URL;

    const message =
      `Hey! 👋 *${fromUserName}* wil je een anytimer geven in *${orgName}*.\n` +
      `Reden: _"${reason}"_\n\n` +
      `✅ Accepteren: ${base}?action=accept&id=${anytimerId}\n` +
      `❌ Weigeren: ${base}?action=decline&id=${anytimerId}`;

    await sendWhatsappMessage(phone, message);
  } catch (err) {
    console.error('[WhatsApp] notifyAnyReceived mislukt:', err);
  }
}

/** Jouw verzoek is geaccepteerd. */
export async function notifyAnyAccepted(
  toUserId: number,
  receiverName: string,
  reason: string,
  anytimerId: number
): Promise<void> {
  try {
    const phone = await getUserPhone(toUserId);
    if (!phone) return;

    const orgSlug = getOrgSlug(anytimerId);
    const base = orgSlug ? `${APP_URL}/org/${orgSlug}` : APP_URL;

    const message =
      `✅ *${receiverName}* heeft jouw anytimer geaccepteerd!\n` +
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
