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
    resolved_at DATETIME
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

export type User = {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  push_subscription: string | null;
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
