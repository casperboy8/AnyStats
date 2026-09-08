import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { createResetToken } from '@/lib/password-reset';
import { sendWhatsappMessage } from '@/lib/whatsapp/client';
import { sendMail } from '@/lib/mail';
import { checkRateLimit } from '@/lib/rate-limit';
import type { User } from '@/lib/db';

const APP_URL = process.env.APP_URL ?? 'https://anystats.nl';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';

  const { email } = await req.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email is verplicht' }, { status: 400 });
  }
  const emailLower = email.trim().toLowerCase();

  // Limiteer per IP en per e-mailadres, net als bij login/registratie.
  if (!checkRateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000)
    || !checkRateLimit(`forgot:${emailLower}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Te veel pogingen. Probeer het over 15 minuten opnieuw.' }, { status: 429 });
  }

  // Altijd hetzelfde antwoord, of het account nu bestaat of niet —
  // anders kan een aanvaller via deze route achterhalen welke e-mailadressen bekend zijn.
  const genericMessage = 'Als er een account bij dit e-mailadres bestaat, ontvang je zo een link om je wachtwoord te resetten.';

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(emailLower) as User | undefined;
  if (!user) {
    return NextResponse.json({ ok: true, message: genericMessage });
  }

  const token = createResetToken(user.id);
  const link = `${APP_URL}/reset-password?token=${token}`;

  let sent = false;

  if (user.phone_number && user.whatsapp_notifications) {
    const waMessage =
      `🔑 Wachtwoord resetten voor AnyStats.\n\n` +
      `Klik binnen 30 minuten op de link om een nieuw wachtwoord in te stellen:\n${link}\n\n` +
      `Niet zelf aangevraagd? Negeer dit bericht, er verandert dan niets.`;
    const waSent = await sendWhatsappMessage(user.phone_number, waMessage);
    sent = sent || waSent;
  }

  const mailSent = await sendMail(
    user.email,
    'Wachtwoord resetten — AnyStats',
    `Klik op de volgende link om je wachtwoord te resetten (verloopt na 30 minuten):\n\n${link}\n\nNiet zelf aangevraagd? Negeer dit bericht, er verandert dan niets.`,
    `<p>Klik op de volgende link om je wachtwoord te resetten (verloopt na 30 minuten):</p>` +
      `<p><a href="${link}">${link}</a></p>` +
      `<p>Niet zelf aangevraagd? Negeer dit bericht, er verandert dan niets.</p>`
  );
  sent = sent || mailSent;

  if (!sent) {
    console.warn(`[forgot-password] Geen kanaal beschikbaar voor gebruiker ${user.id} (${user.email})`);
  }

  return NextResponse.json({ ok: true, message: genericMessage });
}
