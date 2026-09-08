/**
 * Wachtwoord-reset tokens.
 *
 * Alleen de SHA-256 hash van het token wordt opgeslagen — het ruwe token gaat
 * uitsluitend in de reset-link (WhatsApp/e-mail), zodat een DB-leak op zichzelf
 * geen geldige reset-tokens oplevert. Tokens zijn 30 minuten geldig en éénmalig
 * bruikbaar (worden gewist na gebruik).
 */

import crypto from 'crypto';
import db from './db';
import type { User } from './db';

const TOKEN_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Genereert een nieuw reset-token voor deze gebruiker en slaat de hash op. */
export function createResetToken(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  db.prepare('UPDATE users SET reset_token_hash = ?, reset_token_expires_at = ? WHERE id = ?')
    .run(hashToken(token), expiresAt, userId);

  return token;
}

/** Zoekt de gebruiker bij een (nog geldig) reset-token, zonder het te verbruiken. */
export function findUserByResetToken(token: string): User | null {
  const user = db.prepare('SELECT * FROM users WHERE reset_token_hash = ?')
    .get(hashToken(token)) as User | undefined;

  if (!user || !user.reset_token_expires_at) return null;
  if (new Date(user.reset_token_expires_at).getTime() < Date.now()) return null;

  return user;
}

/** Wist het reset-token van een gebruiker (na gebruik, of om een oude link ongeldig te maken). */
export function clearResetToken(userId: number): void {
  db.prepare('UPDATE users SET reset_token_hash = NULL, reset_token_expires_at = NULL WHERE id = ?').run(userId);
}
