import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getWhatsappClient } from '@/lib/whatsapp/client';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const client = getWhatsappClient();
  if (!client) {
    return NextResponse.json({ error: 'WhatsApp client niet actief' }, { status: 400 });
  }

  try {
    await client.logout();
    // Reset init-vlag zodat de admin opnieuw kan initialiseren
    globalThis.__wa_init = false;
  } catch (err) {
    console.error('[WhatsApp] Logout mislukt:', err);
    return NextResponse.json({ error: 'Ontkoppelen mislukt' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
