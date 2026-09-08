/**
 * Transactionele e-mail (wachtwoord-reset fallback naast WhatsApp).
 *
 * Verzendt via een dedicated mailbox op de mailserver — losstaand van de
 * persoonlijke/zakelijke mailboxen. Geconfigureerd via SMTP_* in .env.
 * Als SMTP niet is geconfigureerd, wordt er niets verstuurd (en gewoon gelogd) —
 * de WhatsApp-flow blijft dan het enige kanaal.
 */

import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null | undefined;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: false,     // port 587 = STARTTLS, niet implicit TLS
    requireTLS: true,  // weiger onversleuteld te versturen
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/**
 * Stuur een e-mail. Gooit nooit een error — mislukte mails worden gelogd,
 * zodat een aanroeper altijd door kan naar het volgende kanaal (WhatsApp).
 */
export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn('[mail] SMTP niet geconfigureerd — mail niet verstuurd naar', to);
    return false;
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error('[mail] Versturen mislukt naar', to, ':', err);
    return false;
  }
}
