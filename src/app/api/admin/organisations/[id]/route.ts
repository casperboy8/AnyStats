import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { id } = await params;
  db.prepare('UPDATE anytimers SET organisation_id = NULL WHERE organisation_id = ?').run(id);
  db.prepare('DELETE FROM organisations WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
