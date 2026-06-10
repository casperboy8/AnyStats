import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership, hasMinRole } from '@/lib/org';
import type { Organisation } from '@/lib/db';
import { randomUUID, randomBytes } from 'crypto';

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  // Verwerp bytes boven het grootste veelvoud van 36 om modulo-bias te vermijden
  const limit = 256 - (256 % chars.length);
  let code = '';
  while (code.length < 8) {
    for (const b of randomBytes(16)) {
      if (b < limit) code += chars[b % chars.length];
      if (code.length === 8) break;
    }
  }
  return code;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const isSuperAdmin = session.role === 'admin';
  const membership = getOrgMembership(org.id, session.id);
  if (!isSuperAdmin && (!membership || !hasMinRole(membership, 'admin'))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const invites = db.prepare(`
    SELECT i.*, u.username AS created_by_username
    FROM organisation_invites i
    JOIN users u ON u.id = i.created_by
    WHERE i.organisation_id = ?
    ORDER BY i.created_at DESC
  `).all(org.id);

  return NextResponse.json(invites);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { slug } = await params;
  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(slug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

  const isSuperAdmin = session.role === 'admin';
  const membership = getOrgMembership(org.id, session.id);
  if (!isSuperAdmin && (!membership || !hasMinRole(membership, 'admin'))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const { role = 'member', max_uses, expires_hours } = await req.json();
  if (!['member', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Ongeldige rol' }, { status: 400 });
  }

  // Genereer unieke code
  let code = generateCode();
  let attempts = 0;
  while (db.prepare('SELECT id FROM organisation_invites WHERE code = ?').get(code) && attempts < 10) {
    code = generateCode();
    attempts++;
  }

  const expiresAt = expires_hours
    ? new Date(Date.now() + expires_hours * 3600 * 1000).toISOString()
    : null;

  const id = randomUUID();
  db.prepare(`
    INSERT INTO organisation_invites (id, organisation_id, code, role, created_by, expires_at, max_uses)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, org.id, code, role, session.id, expiresAt, max_uses ?? null);

  return NextResponse.json({ ok: true, code });
}
