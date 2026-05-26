import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { id } = await params;
  const { role } = await req.json();

  if (!['user', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Ongeldig role' }, { status: 400 });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { id } = await params;
  if (Number(id) === session.id) {
    return NextResponse.json({ error: 'Kan jezelf niet verwijderen' }, { status: 400 });
  }

  db.prepare('DELETE FROM anytimers WHERE giver_id = ? OR receiver_id = ?').run(id, id);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);

  return NextResponse.json({ ok: true });
}
