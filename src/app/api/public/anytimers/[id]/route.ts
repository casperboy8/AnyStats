import { NextRequest, NextResponse } from 'next/server';
import { getAnytimer, getUserDisplayName, getConfirmerId } from '@/lib/anytimers';
import { verifyAnytimerToken } from '@/lib/anytimer-token';

/**
 * Publiek endpoint (geen login) om een any te bekijken via het WhatsApp-linkje.
 * Toegang wordt uitsluitend bepaald door het token — niet door een sessie. Wie
 * een geldig token heeft, IS de bevestiger; welke rol (gever/ontvanger) dat is
 * bepaalt alleen de tekst op de pagina.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get('token');

  const anytimer = getAnytimer(id);
  if (!anytimer || !verifyAnytimerToken(anytimer.accept_token_hash, token)) {
    return NextResponse.json({ error: 'Dit linkje is ongeldig' }, { status: 404 });
  }

  const confirmerId = getConfirmerId(anytimer);
  const confirmerRole: 'receiver' | 'giver' = confirmerId === anytimer.receiver_id ? 'receiver' : 'giver';
  const otherUserId = confirmerRole === 'receiver' ? anytimer.giver_id : anytimer.receiver_id;

  return NextResponse.json({
    id: anytimer.id,
    reason: anytimer.reason,
    status: anytimer.status,
    confirmerRole,
    otherUserName: getUserDisplayName(otherUserId),
  });
}
