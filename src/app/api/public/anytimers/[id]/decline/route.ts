import { NextRequest, NextResponse } from 'next/server';
import { getAnytimer, declineAnytimer } from '@/lib/anytimers';
import { verifyAnytimerToken } from '@/lib/anytimer-token';

/** Weigeren via het WhatsApp-linkje — geen login nodig, het token bewijst dat jij de ontvanger bent. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token } = await req.json();

  const anytimer = getAnytimer(id);
  if (!anytimer || !verifyAnytimerToken(anytimer.accept_token_hash, token)) {
    return NextResponse.json({ error: 'Dit linkje is ongeldig' }, { status: 404 });
  }
  if (anytimer.status !== 'pending') {
    return NextResponse.json({ error: 'Deze any is al beantwoord' }, { status: 400 });
  }

  await declineAnytimer(anytimer);

  return NextResponse.json({ ok: true });
}
