import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { writeProof } from '@/lib/storage';
import { randomUUID } from 'crypto';
import type { Anytimer } from '@/lib/db';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { id } = await params;
  const anytimer = db.prepare('SELECT * FROM anytimers WHERE id = ?').get(id) as Anytimer | undefined;

  if (!anytimer) return NextResponse.json({ error: 'Anytimer niet gevonden' }, { status: 404 });
  if (anytimer.receiver_id !== session.id) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  if (anytimer.status !== 'inzetten_pending') {
    return NextResponse.json({ error: 'Bewijs kan alleen geüpload worden als de any ingezet is' }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Geen bestand meegestuurd' }, { status: 400 });

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: 'Alleen afbeeldingen en video\'s toegestaan' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Bestand te groot (max 100 MB)' }, { status: 400 });
  }

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await writeProof(filename, buffer);
  } catch (err) {
    console.error('[upload] Opslaan mislukt:', err);
    return NextResponse.json({ error: 'Opslaan mislukt — probeer opnieuw' }, { status: 500 });
  }

  const proofUrl = `/api/uploads/${filename}`;
  db.prepare('UPDATE anytimers SET proof_url = ? WHERE id = ?').run(proofUrl, id);

  return NextResponse.json({ ok: true, proof_url: proofUrl });
}
