import crypto from 'crypto';
import db from './db';

/**
 * Token waarmee de ontvanger een any kan accepteren/weigeren via het
 * WhatsApp-linkje, zonder in te loggen. Blijft geldig zolang de any nog
 * 'pending' is — er is bewust geen aparte vervaltijd, de status zelf bepaalt
 * of het linkje nog iets mag doen.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createAnytimerToken(anytimerId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE anytimers SET accept_token_hash = ? WHERE id = ?').run(hashToken(token), anytimerId);
  return token;
}

export function verifyAnytimerToken(acceptTokenHash: string | null, token: string | null): boolean {
  if (!acceptTokenHash || !token) return false;
  return acceptTokenHash === hashToken(token);
}
