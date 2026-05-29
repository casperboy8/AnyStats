import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const users = db.prepare(
    'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
  ).all();

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { username, email, password, role } = await req.json();
  if (!username || !email || !password) {
    return NextResponse.json({ error: 'Alle velden verplicht' }, { status: 400 });
  }

  const emailLower = email.trim().toLowerCase();
  const usernameLower = username.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?').get(emailLower, usernameLower);
  if (existing) return NextResponse.json({ error: 'Email of gebruikersnaam al in gebruik' }, { status: 409 });

  const hash = await bcrypt.hash(password, 12);
  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(usernameLower, emailLower, hash, role || 'user');

  return NextResponse.json({ ok: true, id: result.lastInsertRowid });
}
