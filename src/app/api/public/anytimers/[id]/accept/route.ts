import { NextRequest, NextResponse } from 'next/server';
import { getAnytimers, acceptAnytimerBatch } from '@/lib/anytimers';
import { verifyAnytimerToken } from '@/lib/anytimer-token';

/** Accepteren via het WhatsApp-linkje — geen login nodig, het token bewijst dat jij de ontvanger bent. Werkt ook op een batch any's tegelijk. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token } = await req.json();

  const ids = id.split(',').map(s => s.trim()).filter(Boolean);
  const anytimers = getAnytimers(ids);
  if (anytimers.length === 0 || anytimers.length !== ids.length || anytimers.some(a => !verifyAnytimerToken(a.accept_token_hash, token))) {
    return NextResponse.json({ error: 'Dit linkje is ongeldig' }, { status: 404 });
  }
  const pending = anytimers.filter(a => a.status === 'pending');
  if (pending.length === 0) {
    return NextResponse.json({ error: 'Deze any is al beantwoord' }, { status: 400 });
  }

  const count = await acceptAnytimerBatch(pending);
  if (count === 0) return NextResponse.json({ error: 'Deze any is al beantwoord' }, { status: 400 });

  return NextResponse.json({ ok: true });
}
