import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readProof } from '@/lib/storage';
import path from 'path';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { path: segments } = await params;
  // Path traversal preventie
  const filename = path.basename(segments.join('/'));

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
