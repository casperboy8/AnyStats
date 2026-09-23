import { NextRequest, NextResponse } from 'next/server';
import { getAnytimers, getUserDisplayName, getConfirmerId } from '@/lib/anytimers';
import { verifyAnytimerToken } from '@/lib/anytimer-token';

/**
 * Publiek endpoint (geen login) om een any (of een hele batch any's, die
 * dezelfde `id`-lijst en hetzelfde token delen) te bekijken via het
 * WhatsApp-linkje. Toegang wordt uitsluitend bepaald door het token — niet
 * door een sessie. Wie een geldig token heeft, IS de bevestiger; welke rol
 * (gever/ontvanger) dat is bepaalt alleen de tekst op de pagina.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get('token');

  const ids = id.split(',').map(s => s.trim()).filter(Boolean);
  const anytimers = getAnytimers(ids);
  if (anytimers.length === 0 || anytimers.length !== ids.length || anytimers.some(a => !verifyAnytimerToken(a.accept_token_hash, token))) {
    return NextResponse.json({ error: 'Dit linkje is ongeldig' }, { status: 404 });
  }

  const first = anytimers[0];
  const confirmerId = getConfirmerId(first);
  const confirmerRole: 'receiver' | 'giver' = confirmerId === first.receiver_id ? 'receiver' : 'giver';
  const otherUserId = confirmerRole === 'receiver' ? first.giver_id : first.receiver_id;
  const pendingCount = anytimers.filter(a => a.status === 'pending').length;

  return NextResponse.json({
    id: first.id,
    reason: first.reason,
    count: anytimers.length,
    status: pendingCount > 0 ? 'pending' : first.status,
    confirmerRole,
    otherUserName: getUserDisplayName(otherUserId),
  });
}
