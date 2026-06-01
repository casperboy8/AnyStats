import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { readProof } from '@/lib/storage';
import path from 'path';
import type { Anytimer } from '@/lib/db';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { path: segments } = await params;
  // Path traversal preventie: gebruik alleen de bestandsnaam, geen mappen
  const filename = path.basename(segments.join('/'));

  // Controleer of de ingelogde gebruiker toegang heeft tot dit bestand
  const proofUrl = `/api/uploads/${filename}`;
  const anytimer = db.prepare('SELECT giver_id, receiver_id FROM anytimers WHERE proof_url = ?').get(proofUrl) as Pick<Anytimer, 'giver_id' | 'receiver_id'> | undefined;

  // Bestand bestaat maar gebruiker is geen giver/receiver én geen super admin → weiger
  const isSuperAdmin = (db.prepare('SELECT role FROM users WHERE id = ?').get(session.id) as { role: string } | undefined)?.role === 'admin';
  if (!isSuperAdmin && anytimer && anytimer.giver_id !== session.id && anytimer.receiver_id !== session.id) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  let data: Buffer;
  try {
    data = await readProof(filename);
  } catch {
    return NextResponse.json({ error: 'Bestand niet gevonden' }, { status: 404 });
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const contentType = MIME[ext] ?? 'application/octet-stream';

  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
