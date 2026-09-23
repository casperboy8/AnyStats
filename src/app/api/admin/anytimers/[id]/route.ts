import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { id } = await params;
  const { status } = await req.json();

  const valid = ['pending', 'active', 'inzetten_pending', 'completed', 'declined'];
  if (!valid.includes(status)) {
    return NextResponse.json({ error: 'Ongeldig status' }, { status: 400 });
  }

  // Zelfde timestamp-boekhouding als de normale accept/inzetten/bevestigen/decline-flows,
  // zodat een handmatige admin-statuswijziging geen rijen met een ontbrekende
  // activated_at/resolved_at achterlaat.
  const timestampColumn = status === 'inzetten_pending' ? 'activated_at'
    : status === 'completed' || status === 'declined' ? 'resolved_at'
    : null;

  db.prepare(
    `UPDATE anytimers SET status = ?${timestampColumn ? `, ${timestampColumn} = CURRENT_TIMESTAMP` : ''} WHERE id = ?`
  ).run(status, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { id } = await params;
  db.prepare('DELETE FROM anytimers WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
