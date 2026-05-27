/**
 * WhatsApp notificatie-helpers voor AnyStats.
 *
 * Elke functie:
 * 1. Haalt het telefoonnummer van de ontvanger op uit de database
 * 2. Controleert of phone_number ingevuld is en whatsapp_notifications aan staat
 * 3. Verstuurt een vriendelijk Nederlandstalig bericht
 *
 * Notificaties zijn NIET kritiek — een fout hier gooit nooit een exception.
 */

import db from '@/lib/db';
import { sendWhatsappMessage } from './client';
import type { User } from '@/lib/db';

async function getUserPhone(userId: number): Promise<string | null> {
  const user = db.prepare(
    'SELECT phone_number, whatsapp_notifications FROM users WHERE id = ?'
  ).get(userId) as Pick<User, 'phone_number' | 'whatsapp_notifications'> | undefined;

  if (!user?.phone_number) return null;
  if (!user.whatsapp_notifications) return null; // opt-out

  return user.phone_number;
}

/** Iemand heeft jou een anytimer gegeven (jij bent de ontvanger). */
export async function notifyAnyReceived(
  toUserId: number,
  fromUserName: string,
  reason: string,
  orgName: string
): Promise<void> {
  try {
    const phone = await getUserPhone(toUserId);
    if (!phone) return;

    const message =
      `Hey! 👋 *${fromUserName}* wil je een anytimer geven in *${orgName}*.\n` +
      `Reden: _"${reason}"_\n\n` +
      `Open AnyStats om te accepteren of weigeren.`;

    await sendWhatsappMessage(phone, message);
  } catch (err) {
    console.error('[WhatsApp] notifyAnyReceived mislukt:', err);
  }
}

/** Jouw verzoek is geaccepteerd (jij bent de gever). */
export async function notifyAnyAccepted(
  toUserId: number,
  receiverName: string,
  reason: string
): Promise<void> {
  try {
    const phone = await getUserPhone(toUserId);
    if (!phone) return;

    const message =
      `✅ *${receiverName}* heeft jouw anytimer geaccepteerd!\n` +
      `_"${reason}"_`;

    await sendWhatsappMessage(phone, message);
  } catch (err) {
    console.error('[WhatsApp] notifyAnyAccepted mislukt:', err);
  }
}

/** Iemand heeft de anytimer ingezet — jij moet nu drinken (jij bent de ontvanger). */
export async function notifyAnyIngezet(
  toUserId: number,
  giverName: string,
  reason: string
): Promise<void> {
  try {
    const phone = await getUserPhone(toUserId);
    if (!phone) return;

    const message =
      `🍺 *${giverName}* heeft de anytimer ingezet!\n` +
      `_"${reason}"_\n\n` +
      `Upload je bewijs op AnyStats.`;

    await sendWhatsappMessage(phone, message);
  } catch (err) {
    console.error('[WhatsApp] notifyAnyIngezet mislukt:', err);
  }
}

/** Gebruiker is toegevoegd aan een organisatie. */
export async function notifyAddedToOrg(
  toUserId: number,
  orgName: string,
  role: string
): Promise<void> {
  try {
    const phone = await getUserPhone(toUserId);
    if (!phone) return;

    const rolLabel = role === 'owner' ? 'eigenaar' : role === 'admin' ? 'beheerder' : 'lid';

    const message =
      `Hey! 👋 Je bent toegevoegd aan *${orgName}* op AnyStats als *${rolLabel}*.\n` +
      `Welkom! 🎉`;

    await sendWhatsappMessage(phone, message);
  } catch (err) {
    console.error('[WhatsApp] notifyAddedToOrg mislukt:', err);
  }
}
