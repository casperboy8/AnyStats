import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { id } = await params;
  const { user_id } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: 'Gebruiker verplicht' }, { status: 400 });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) {
    return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 400 });
  }

  const result = db.prepare('UPDATE barf_events SET user_id = ? WHERE id = ?').run(user_id, id);
  if (result.changes === 0) {
    return NextResponse.json({ error: 'Registratie niet gevonden' }, { status: 404 });
  }

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
