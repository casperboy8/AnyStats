import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'anytimer.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    push_subscription TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS anytimers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    giver_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    activated_at DATETIME,
    resolved_at DATETIME,
    proof_url TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    related_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Org tabellen
db.exec(`
  CREATE TABLE IF NOT EXISTS organisations (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url    TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS organisation_members (
    id              TEXT PRIMARY KEY,
    organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'member')) DEFAULT 'member',
    joined_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organisation_id, user_id)
  );
`);

// Videos tabel
db.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id              TEXT PRIMARY KEY,
    organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    uploaded_by     INTEGER NOT NULL REFERENCES users(id),
    filename        TEXT NOT NULL,
    storage_path    TEXT NOT NULL,
    file_size_bytes INTEGER,
    duration_seconds INTEGER,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Koppelcodes voor teams
db.exec(`
  CREATE TABLE IF NOT EXISTS organisation_invites (
    id              TEXT PRIMARY KEY,
    organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    code            TEXT NOT NULL UNIQUE,
    role            TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
    created_by      INTEGER NOT NULL REFERENCES users(id),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at      DATETIME,
    max_uses        INTEGER,
    use_count       INTEGER NOT NULL DEFAULT 0
  );
`);

// Kolom migraties (veilig: catch als kolom al bestaat)
for (const sql of [
  'ALTER TABLE anytimers ADD COLUMN proof_url TEXT',
  'ALTER TABLE anytimers ADD COLUMN organisation_id TEXT REFERENCES organisations(id)',
  // WhatsApp-velden op gebruikers
  'ALTER TABLE users ADD COLUMN phone_number TEXT',
  'ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0',
  'ALTER TABLE users ADD COLUMN whatsapp_notifications INTEGER DEFAULT 1',
]) {
  try { db.exec(sql); } catch { /* bestaat al */ }
}

export type User = {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  push_subscription: string | null;
  phone_number: string | null;
  phone_verified: number;           // 0 = nee, 1 = ja
  whatsapp_notifications: number;   // 0 = uit, 1 = aan
  created_at: string;
};

export type Anytimer = {
  id: number;
  giver_id: number;
  receiver_id: number;
  reason: string;
  status: 'pending' | 'active' | 'inzetten_pending' | 'completed';
  created_at: string;
  activated_at: string | null;
  resolved_at: string | null;
  proof_url: string | null;
  organisation_id: string | null;
};

export type Organisation = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  created_at: string;
};

export type OrganisationMember = {
  id: string;
  organisation_id: string;
  user_id: number;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
};

export type OrganisationInvite = {
  id: string;
  organisation_id: string;
  code: string;
  role: 'admin' | 'member';
  created_by: number;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
};

export type Video = {
  id: string;
  organisation_id: string;
  uploaded_by: number;
  filename: string;
  storage_path: string;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  created_at: string;
};

export type Notification = {
  id: number;
  user_id: number;
  type: string;
  message: string;
  is_read: number;
  related_id: number | null;
  created_at: string;
};

export default db;
