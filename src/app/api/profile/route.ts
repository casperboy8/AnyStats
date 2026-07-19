import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { normalizePhone } from '@/lib/phone';
import type { User } from '@/lib/db';

/** GET /api/profile — haal huidig profiel op */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const user = db.prepare(
    `SELECT id, CASE WHEN first_name != '' THEN first_name || ' ' || last_name ELSE username END AS username, first_name, last_name, email, phone_number, whatsapp_notifications FROM users WHERE id = ?`
  ).get(session.id) as Pick<User, 'id' | 'username' | 'first_name' | 'last_name' | 'email' | 'phone_number' | 'whatsapp_notifications'> | undefined;

  if (!user) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 });

  return NextResponse.json(user);
}

/** PATCH /api/profile — sla telefoonnummer en notificatie-voorkeur op */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const body = await req.json();

  // Voor- en achternaam verwerken (voor bestaande accounts die deze nog niet hadden ingevuld)
  if ('first_name' in body || 'last_name' in body) {
    const firstName = (body.first_name as string)?.trim() ?? '';
    const lastName = (body.last_name as string)?.trim() ?? '';
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'Voornaam en achternaam zijn verplicht' }, { status: 400 });
    }
    db.prepare('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?').run(firstName, lastName, session.id);
  }

  // Telefoonnummer verwerken
  if ('phone_number' in body) {
    const raw = (body.phone_number as string)?.trim() ?? '';

    if (raw === '') {
      // Gebruiker wist het nummer
      db.prepare('UPDATE users SET phone_number = NULL WHERE id = ?').run(session.id);
    } else {
      const normalized = normalizePhone(raw);
      if (!normalized) {
        return NextResponse.json(
          { error: 'Ongeldig telefoonnummer. Gebruik bijv. +31612345678 of 0612345678' },
          { status: 400 }
        );
      }
      db.prepare('UPDATE users SET phone_number = ? WHERE id = ?').run(normalized, session.id);
    }
  }

  // WhatsApp notificaties toggle
  if ('whatsapp_notifications' in body) {
    const enabled = body.whatsapp_notifications ? 1 : 0;
    db.prepare('UPDATE users SET whatsapp_notifications = ? WHERE id = ?').run(enabled, session.id);
  }

  return NextResponse.json({ ok: true });
}
