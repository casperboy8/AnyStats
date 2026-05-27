import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sendWhatsappMessage } from '@/lib/whatsapp/client';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { phone, message } = await req.json();
  if (!phone?.trim()) {
    return NextResponse.json({ error: 'Telefoonnummer is verplicht' }, { status: 400 });
  }

  const text = message?.trim() || 'Dit is een testbericht van AnyStats 👋';
  const ok = await sendWhatsappMessage(phone.trim(), text);

  if (!ok) {
    return NextResponse.json({ error: 'Sturen mislukt — is WhatsApp verbonden?' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
