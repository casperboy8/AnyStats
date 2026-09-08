import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAnytimer, declineAnytimer } from '@/lib/anytimers';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { id } = await params;
  const anytimer = getAnytimer(id);

  if (!anytimer) return NextResponse.json({ error: 'Anytimer niet gevonden' }, { status: 404 });
  if (anytimer.receiver_id !== session.id) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  if (anytimer.status !== 'pending') return NextResponse.json({ error: 'Kan niet weigeren' }, { status: 400 });

  await declineAnytimer(anytimer);

  return NextResponse.json({ ok: true });
}
