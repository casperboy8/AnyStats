/**
 * Hulpfuncties voor telefoonnummer-normalisatie.
 *
 * Standaard aanname: Nederland (+31).
 * Ondersteunde invoer:
 *   06XXXXXXXX   → +316XXXXXXXX
 *   0XXXXXXXXX   → +31XXXXXXXXX
 *   31XXXXXXXXX  → +31XXXXXXXXX
 *   +31...       → ongewijzigd (als het klopt)
 *   +XX...       → ongewijzigd (andere landen)
 */
export function normalizePhone(raw: string): string | null {
  // Verwijder alles behalve cijfers, + en een eventuele leading +
  const cleaned = raw.replace(/[\s\-\(\)\.]/g, '');

  if (!cleaned) return null;

  // Al internationaal formaat
  if (cleaned.startsWith('+')) {
    return /^\+\d{8,15}$/.test(cleaned) ? cleaned : null;
  }

  // 06XXXXXXXX → +316XXXXXXXX (NL mobiel, 10 cijfers)
  if (/^06\d{8}$/.test(cleaned)) {
    return '+31' + cleaned.slice(1);
  }

  // 0XXXXXXXXX → +31XXXXXXXXX (NL vaste lijn, 9-10 cijfers na 0)
  if (/^0\d{8,9}$/.test(cleaned)) {
    return '+31' + cleaned.slice(1);
  }

  // 31XXXXXXXXX → +31XXXXXXXXX (zonder + maar met landcode)
  if (/^31\d{9}$/.test(cleaned)) {
    return '+' + cleaned;
  }

  // Puur cijfers zonder landcode (9-10 cijfers) → NL aannemen
  if (/^\d{9,10}$/.test(cleaned)) {
    return '+31' + cleaned;
  }

  return null;
}
