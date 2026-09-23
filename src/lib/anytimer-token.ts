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
  return createAnytimerTokenForIds([anytimerId]);
}

/** Zelfde token voor een hele batch any's — zo kan de counterpart ze in één tik allemaal accepteren/weigeren. */
export function createAnytimerTokenForIds(anytimerIds: number[]): string {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  const placeholders = anytimerIds.map(() => '?').join(',');
  db.prepare(`UPDATE anytimers SET accept_token_hash = ? WHERE id IN (${placeholders})`).run(hash, ...anytimerIds);
  return token;
}

export function verifyAnytimerToken(acceptTokenHash: string | null, token: string | null): boolean {
  if (!acceptTokenHash || !token) return false;
  return acceptTokenHash === hashToken(token);
}
