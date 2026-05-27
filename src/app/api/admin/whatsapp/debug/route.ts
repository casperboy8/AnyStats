import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getWhatsappStatus } from '@/lib/whatsapp/client';
import db from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const waStatus = getWhatsappStatus();

  const users = db.prepare(`
    SELECT id, username, email,
           phone_number,
           whatsapp_notifications,
           CASE WHEN phone_number IS NULL THEN 'geen nummer'
                WHEN whatsapp_notifications = 0 THEN 'notificaties uit'
                ELSE 'OK' END AS wa_status
    FROM users
    ORDER BY username
  `).all();

  return NextResponse.json({ whatsapp: waStatus, users });
}
