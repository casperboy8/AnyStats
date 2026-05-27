import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const orgs = db.prepare('SELECT * FROM organisations ORDER BY name').all();
  return NextResponse.json(orgs);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { name, slug, description, owner_id } = await req.json();

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: 'Naam en slug zijn verplicht' }, { status: 400 });
  }
  if (!owner_id) {
    return NextResponse.json({ error: 'Kies een eigenaar' }, { status: 400 });
  }

  const slugClean = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slugClean)) {
    return NextResponse.json({ error: 'Slug mag alleen kleine letters, cijfers en koppeltekens bevatten' }, { status: 400 });
  }

  const existing = db.prepare('SELECT id FROM organisations WHERE slug = ?').get(slugClean);
  if (existing) return NextResponse.json({ error: 'Deze slug is al in gebruik' }, { status: 409 });

  const owner = db.prepare('SELECT id FROM users WHERE id = ?').get(owner_id);
  if (!owner) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 });

  const orgId = randomUUID();
  db.prepare('INSERT INTO organisations (id, name, slug, description) VALUES (?, ?, ?, ?)').run(
    orgId, name.trim(), slugClean, description?.trim() || null
  );
  db.prepare('INSERT INTO organisation_members (id, organisation_id, user_id, role) VALUES (?, ?, ?, ?)').run(
    randomUUID(), orgId, owner_id, 'owner'
  );

  return NextResponse.json({ ok: true, slug: slugClean });
}
