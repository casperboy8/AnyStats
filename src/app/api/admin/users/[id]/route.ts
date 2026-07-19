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
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  })();

  return NextResponse.json({ ok: true });
}
