import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership } from '@/lib/org';
import { smbReadRange, smbReadFile, smbFileSize } from '@/lib/smb';
import type { Video } from '@/lib/db';

const MIME_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
};

function extOf(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB per Range-chunk

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { id } = await params;

  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as Video | undefined;
  if (!video) return NextResponse.json({ error: 'Video niet gevonden' }, { status: 404 });

  // Controleer of de gebruiker lid is van de organisatie van de video
  const membership = getOrgMembership(video.organisation_id, session.id);
  if (!membership) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const contentType = MIME_MAP[extOf(video.filename)] ?? 'application/octet-stream';
  const rangeHeader = req.headers.get('range');

  if (rangeHeader) {
    // Verwerk Range-header (bijv. "bytes=0-1048575")
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      // Haal bestandsgrootte op om de 416-response te kunnen vullen
      let totalSize = video.file_size_bytes ?? 0;
      if (!totalSize) {
        try { totalSize = await smbFileSize(video.storage_path); } catch { /* ignore */ }
      }
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${totalSize}` },
      });
    }

    const startRequested = parseInt(match[1], 10);

    try {
      // Lees de chunk; smbReadRange geeft ook totalSize terug
      const endRequested = match[2] ? parseInt(match[2], 10) : startRequested + CHUNK_SIZE - 1;
      const { data, totalSize } = await smbReadRange(
        video.storage_path,
        startRequested,
        Math.min(endRequested, startRequested + CHUNK_SIZE - 1)
      );

      const end = startRequested + data.length - 1;

      return new NextResponse(new Uint8Array(data), {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${startRequested}-${end}/${totalSize}`,
          'Content-Length': String(data.length),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, no-store',
        },
      });
    } catch (err) {
      console.error('[SMB] readRange error:', err);
      return NextResponse.json({ error: 'Leesfout' }, { status: 500 });
    }
  }

  // Geen Range-header → stuur het hele bestand
  try {
    const data = await smbReadFile(video.storage_path);
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(data.length),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('[SMB] readFile error:', err);
    return NextResponse.json({ error: 'Leesfout' }, { status: 500 });
  }
}
