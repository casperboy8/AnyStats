import { NextRequest, NextResponse } from 'next/server';
import { getAnytimer, getUserDisplayName } from '@/lib/anytimers';
import { verifyAnytimerToken } from '@/lib/anytimer-token';

/**
 * Publiek endpoint (geen login) om een any te bekijken via het WhatsApp-linkje.
 * Toegang wordt uitsluitend bepaald door het token — niet door een sessie.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get('token');

  const anytimer = getAnytimer(id);
  if (!anytimer || !verifyAnytimerToken(anytimer.accept_token_hash, token)) {
    return NextResponse.json({ error: 'Dit linkje is ongeldig' }, { status: 404 });
  }

  return NextResponse.json({
    id: anytimer.id,
    reason: anytimer.reason,
    status: anytimer.status,
    giverName: getUserDisplayName(anytimer.giver_id),
  });
}
