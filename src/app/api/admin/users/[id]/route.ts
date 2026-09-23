import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { normalizePhone } from '@/lib/phone';
import type { User } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { id } = await params;
  const user = db.prepare(
    'SELECT id, username, first_name, last_name, email, phone_number, whatsapp_notifications, role, created_at FROM users WHERE id = ?'
  ).get(id) as Omit<User, 'password_hash' | 'push_subscription' | 'phone_verified' | 'reset_token_hash' | 'reset_token_expires_at'> | undefined;

  if (!user) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { id } = await params;
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 });

  const body = await req.json();

  if ('role' in body) {
    if (!['user', 'admin'].includes(body.role)) {
      return NextResponse.json({ error: 'Ongeldige rol' }, { status: 400 });
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(body.role, id);
  }

  if ('username' in body) {
    const usernameLower = (body.username as string)?.trim().toLowerCase();
    if (!usernameLower) return NextResponse.json({ error: 'Gebruikersnaam is verplicht' }, { status: 400 });
    const clash = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?').get(usernameLower, id);
    if (clash) return NextResponse.json({ error: 'Gebruikersnaam al in gebruik' }, { status: 409 });
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(usernameLower, id);
  }

  if ('email' in body) {
    const emailLower = (body.email as string)?.trim().toLowerCase();
    if (!emailLower) return NextResponse.json({ error: 'Email is verplicht' }, { status: 400 });
    const clash = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?').get(emailLower, id);
    if (clash) return NextResponse.json({ error: 'Email al in gebruik' }, { status: 409 });
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(emailLower, id);
  }

  if ('first_name' in body || 'last_name' in body) {
    const firstName = (body.first_name as string)?.trim() ?? '';
    const lastName = (body.last_name as string)?.trim() ?? '';
    db.prepare('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?').run(firstName, lastName, id);
  }

  if ('phone_number' in body) {
    const raw = (body.phone_number as string)?.trim() ?? '';
    if (raw === '') {
      db.prepare('UPDATE users SET phone_number = NULL WHERE id = ?').run(id);
    } else {
      const normalized = normalizePhone(raw);
      if (!normalized) {
        return NextResponse.json({ error: 'Ongeldig telefoonnummer. Gebruik bijv. +31612345678 of 0612345678' }, { status: 400 });
      }
      db.prepare('UPDATE users SET phone_number = ? WHERE id = ?').run(normalized, id);
    }
  }

  if ('whatsapp_notifications' in body) {
    db.prepare('UPDATE users SET whatsapp_notifications = ? WHERE id = ?').run(body.whatsapp_notifications ? 1 : 0, id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { id } = await params;
  if (Number(id) === session.id) {
    return NextResponse.json({ error: 'Kan jezelf niet verwijderen' }, { status: 400 });
  }

  // Weiger verwijderen zolang deze gebruiker de enige owner van een organisatie is,
  // anders blijft die organisatie zonder owner achter.
  const orphanedOrgs = db.prepare(`
    SELECT o.name FROM organisation_members m
    JOIN organisations o ON o.id = m.organisation_id
    WHERE m.user_id = ? AND m.role = 'owner'
      AND (SELECT COUNT(*) FROM organisation_members m2 WHERE m2.organisation_id = m.organisation_id AND m2.role = 'owner') = 1
  `).all(id) as { name: string }[];
  if (orphanedOrgs.length > 0) {
    return NextResponse.json({
      error: `Wijs eerst een andere owner aan voor: ${orphanedOrgs.map(o => o.name).join(', ')}`,
    }, { status: 409 });
  }

  // Verwijder alles wat naar de gebruiker verwijst zonder ON DELETE CASCADE,
  // anders blokkeert de foreign key constraint de delete.
  db.transaction(() => {
    db.prepare('DELETE FROM anytimers WHERE giver_id = ? OR receiver_id = ?').run(id, id);
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM organisation_invites WHERE created_by = ?').run(id);
    db.prepare('DELETE FROM videos WHERE uploaded_by = ?').run(id);
    db.prepare('DELETE FROM barf_events WHERE logged_by = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  })();

  return NextResponse.json({ ok: true });
}
