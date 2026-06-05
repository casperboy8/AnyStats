import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import type { User } from '@/lib/db';

const MAX_ROWS = 500;

// Alleen SELECT en PRAGMA zijn toegestaan — alle schrijfoperaties worden geblokkeerd.
const ALLOWED_RE = /^\s*(SELECT|PRAGMA|EXPLAIN|WITH)\b/i;
const BLOCKED_RE = /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|ATTACH|DETACH|REPLACE|TRUNCATE|VACUUM|REINDEX)\b/i;

function requireAdmin(): { error: string; status: number } | null {
  return null; // Controle via AdminLayout + hieronder in de handler
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  const dbUser = db.prepare('SELECT role FROM users WHERE id = ?').get(session.id) as Pick<User, 'role'> | undefined;
  if (dbUser?.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') ?? 'tables';

  if (action === 'tables') {
    const tables = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type IN ('table','view')
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as { name: string }[];

    const result = tables.map(t => {
      try {
        const count = (db.prepare(`SELECT count(*) as n FROM "${t.name}"`).get() as { n: number }).n;
        return { name: t.name, rows: count };
      } catch {
        return { name: t.name, rows: null };
      }
    });
    return NextResponse.json(result);
  }

  if (action === 'browse') {
    const table = searchParams.get('table');
    const page = Math.max(0, Number(searchParams.get('page') ?? 0));
    const pageSize = 50;

    if (!table || !/^[a-zA-Z0-9_]+$/.test(table)) {
      return NextResponse.json({ error: 'Ongeldige tabelnaam' }, { status: 400 });
    }

    const total = (db.prepare(`SELECT count(*) as n FROM "${table}"`).get() as { n: number }).n;
    const rows = db.prepare(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`).all(pageSize, page * pageSize);
    const columns = rows.length > 0 ? Object.keys(rows[0] as object) : [];

    return NextResponse.json({ rows, columns, total, page, pageSize });
  }

  return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  const dbUser = db.prepare('SELECT role FROM users WHERE id = ?').get(session.id) as Pick<User, 'role'> | undefined;
  if (dbUser?.role !== 'admin') return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const sql: string = (body.sql ?? '').trim();

  if (!sql) return NextResponse.json({ error: 'Geen query opgegeven' }, { status: 400 });

  // Veiligheidscontrole: alleen leesqueries
  if (!ALLOWED_RE.test(sql) || BLOCKED_RE.test(sql)) {
    return NextResponse.json({
      error: 'Alleen SELECT- en PRAGMA-queries zijn toegestaan. Schrijfoperaties zijn geblokkeerd.',
    }, { status: 403 });
  }

  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all();
    const columns = rows.length > 0 ? Object.keys(rows[0] as object) : [];
    const limited = rows.slice(0, MAX_ROWS);
    return NextResponse.json({
      rows: limited,
      columns,
      total: rows.length,
      truncated: rows.length > MAX_ROWS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
