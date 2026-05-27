import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getWhatsappStatus, initWhatsappClient } from '@/lib/whatsapp/client';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  // Auto-start als de client nog nooit geïnitialiseerd is
  // (bijv. als instrumentation.ts niet werd opgepikt in dev-mode)
  if (!globalThis.__wa_init && globalThis.__wa_status === 'disconnected' && !globalThis.__wa_error) {
    initWhatsappClient();
  }

  return NextResponse.json(getWhatsappStatus());
}
