import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership, hasMinRole } from '@/lib/org';
import type { Organisation } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Organisatie niet gevonden' }, { status: 404 });

  const membership = getOrgMembership(org.id, session.id);
  if (!membership) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  return NextResponse.json({ ...org, role: membership.role });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const membership = getOrgMembership(org.id, session.id);
  if (!membership || !hasMinRole(membership, 'owner')) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });

  db.prepare('UPDATE organisations SET name = ?, description = ? WHERE id = ?').run(
    name.trim(), description?.trim() || null, org.id
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const membership = getOrgMembership(org.id, session.id);
  if (!membership || !hasMinRole(membership, 'owner')) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  db.prepare('DELETE FROM organisations WHERE id = ?').run(org.id);

  return NextResponse.json({ ok: true });
}
