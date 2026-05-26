import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const subscription = await req.json();
  db.prepare('UPDATE users SET push_subscription = ? WHERE id = ?').run(
    JSON.stringify(subscription),
    session.id
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  db.prepare('UPDATE users SET push_subscription = NULL WHERE id = ?').run(session.id);
  return NextResponse.json({ ok: true });
}
