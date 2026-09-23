import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { createResetToken } from '@/lib/password-reset';
import { sendWhatsappMessage } from '@/lib/whatsapp/client';
import { sendMail } from '@/lib/mail';
import type { User } from '@/lib/db';

const APP_URL = process.env.APP_URL ?? 'https://anystats.nl';

/**
 * Admin stuurt (of geeft) een wachtwoord-reset-link voor een gebruiker — voor
 * als iemand z'n wachtwoord kwijt is en zelf niet meer bij het account kan
 * (geen werkend e-mailadres meer, bijv.). Anders dan bij de zelfservice
 * /forgot-password-flow geven we de link hier gewoon terug in de response,
 * zodat de admin 'm ook los kan doorsturen als WA/e-mail niet aankomt.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { id } = await params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  if (!user) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 });

  const token = createResetToken(user.id);
  const link = `${APP_URL}/reset-password?token=${token}`;

  const channels: string[] = [];

  if (user.phone_number && user.whatsapp_notifications) {
    const waMessage =
      `🔑 Een beheerder heeft een wachtwoord-reset voor je AnyStats-account aangevraagd.\n\n` +
      `Klik binnen 30 minuten op de link om een nieuw wachtwoord in te stellen:\n${link}\n\n` +
      `Niet verwacht? Neem contact op met je groep.`;
    if (await sendWhatsappMessage(user.phone_number, waMessage)) channels.push('whatsapp');
  }

  const mailSent = await sendMail(
    user.email,
    'Wachtwoord resetten — AnyStats',
    `Een beheerder heeft een wachtwoord-reset voor je account aangevraagd. Klik op de volgende link om een nieuw wachtwoord in te stellen (verloopt na 30 minuten):\n\n${link}`,
    `<p>Een beheerder heeft een wachtwoord-reset voor je account aangevraagd. Klik op de volgende link om een nieuw wachtwoord in te stellen (verloopt na 30 minuten):</p>` +
      `<p><a href="${link}">${link}</a></p>`
  );
  if (mailSent) channels.push('email');

  return NextResponse.json({ ok: true, link, channels });
}
