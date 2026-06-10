// Simple in-memory rate limiter. Resets on process restart — good enough for brute-force protection.
const store = new Map<string, { count: number; resetAt: number }>();

// Verwijder verlopen entries af en toe, anders groeit de map onbeperkt (één entry per IP).
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
let lastPrune = Date.now();

function pruneExpired(now: number) {
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, record] of store) {
    if (now > record.resetAt) store.delete(key);
  }
}

/**
 * Returns true if the request is allowed, false if rate limit exceeded.
 * @param key      Unique key per action+subject (e.g. `login:1.2.3.4`)
 * @param max      Max attempts allowed within the window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  pruneExpired(now);
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= max) return false;

  record.count++;
  return true;
}
