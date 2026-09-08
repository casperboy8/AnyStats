import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { normalizePhone } from '@/lib/phone';
import { sendWhatsappMessage } from '@/lib/whatsapp/client';
import { checkRateLimit } from '@/lib/rate-limit';
import type { User } from '@/lib/db';

/**
 * POST /api/auth/forgot-username — je e-mailadres vergeten?
 *
 * Er is geen apart "gebruikersnaam" login (je logt in met e-mail), dus dit lost
 * eigenlijk "welk e-mailadres gebruikte ik ook alweer" op. Omdat we zonder e-mail
 * of wachtwoord niets van de gebruiker weten, is het telefoonnummer de enige
 * bruikbare zoeksleutel — en daarmee kan het antwoord alleen via WhatsApp,
 * niet via e-mail (dat is immers precies wat ze vergeten zijn).
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';

  const { phone_number } = await req.json();
  if (!phone_number?.trim()) {
    return NextResponse.json({ error: 'Telefoonnummer is verplicht' }, { status: 400 });
  }

  const normalized = normalizePhone(phone_number.trim());
  if (!normalized) {
    return NextResponse.json({ error: 'Ongeldig telefoonnummer. Gebruik bijv. +31612345678 of 0612345678' }, { status: 400 });
  }

  if (!checkRateLimit(`forgot-username:${ip}`, 5, 15 * 60 * 1000)
    || !checkRateLimit(`forgot-username:${normalized}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Te veel pogingen. Probeer het over 15 minuten opnieuw.' }, { status: 429 });
  }

  // Altijd hetzelfde antwoord, of het nummer nu bekend is of niet — anders kan een
  // aanvaller via deze route achterhalen welke telefoonnummers een account hebben.
  const genericMessage = 'Als dit telefoonnummer bekend is, ontvang je zo een WhatsApp-bericht met je e-mailadres.';

  const user = db.prepare('SELECT * FROM users WHERE phone_number = ?').get(normalized) as User | undefined;
  if (!user || !user.whatsapp_notifications) {
    return NextResponse.json({ ok: true, message: genericMessage });
  }

  const message =
    `👋 Je AnyStats-account:\n\n` +
    `E-mailadres: *${user.email}*\n\n` +
    `Wachtwoord vergeten? Ga naar de "Wachtwoord vergeten"-pagina op de inlogpagina.`;
  await sendWhatsappMessage(user.phone_number!, message);

  return NextResponse.json({ ok: true, message: genericMessage });
}
