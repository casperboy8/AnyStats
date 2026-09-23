import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership } from '@/lib/org';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { id } = await params;
  const { user_id } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: 'Gebruiker verplicht' }, { status: 400 });
  }

  const event = db.prepare('SELECT organisation_id FROM barf_events WHERE id = ?').get(id) as { organisation_id: string } | undefined;
  if (!event) {
    return NextResponse.json({ error: 'Registratie niet gevonden' }, { status: 404 });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) {
    return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 400 });
  }

  if (!getOrgMembership(event.organisation_id, user_id)) {
    return NextResponse.json({ error: 'Gebruiker is geen lid van de groep van deze registratie' }, { status: 400 });
  }

  db.prepare('UPDATE barf_events SET user_id = ? WHERE id = ?').run(user_id, id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { id } = await params;
  const result = db.prepare('DELETE FROM barf_events WHERE id = ?').run(id);
  if (result.changes === 0) {
    return NextResponse.json({ error: 'Registratie niet gevonden' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
