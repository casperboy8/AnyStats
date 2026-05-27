import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { initWhatsappClient, getWhatsappStatus } from '@/lib/whatsapp/client';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { status } = getWhatsappStatus();
  if (status === 'connected' || status === 'initializing') {
    return NextResponse.json({ ok: true, message: `Al actief (${status})` });
  }

  // Reset init-vlag zodat initialisatie opnieuw kan starten
  globalThis.__wa_init = false;
  initWhatsappClient();

  return NextResponse.json({ ok: true, message: 'WhatsApp client wordt opgestart...' });
}
