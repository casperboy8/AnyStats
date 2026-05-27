import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership } from '@/lib/org';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
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

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
}

function resolveStoragePath(storagePath: string): string {
  // Normalize any backslashes to the OS separator
  const normalized = storagePath.replace(/[\\/]/g, path.sep);
  return path.join(uploadDir(), normalized);
}

function streamToReadable(
  filePath: string,
  start?: number,
  end?: number
): ReadableStream<Uint8Array> {
  const stream = createReadStream(filePath, start !== undefined ? { start, end } : undefined);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on('data', (chunk) =>
        controller.enqueue(chunk instanceof Buffer ? new Uint8Array(chunk) : chunk as Uint8Array)
      );
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });
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
  const filePath = resolveStoragePath(video.storage_path);

  try {
    const fileStats = await stat(filePath);
    const totalSize = fileStats.size;
    const rangeHeader = req.headers.get('range');

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${totalSize}` },
        });
      }

      const startRequested = parseInt(match[1], 10);
      const endRequested = match[2] ? parseInt(match[2], 10) : startRequested + CHUNK_SIZE - 1;
      const end = Math.min(endRequested, startRequested + CHUNK_SIZE - 1, totalSize - 1);
      const chunkSize = end - startRequested + 1;

      return new NextResponse(streamToReadable(filePath, startRequested, end), {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${startRequested}-${end}/${totalSize}`,
          'Content-Length': String(chunkSize),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, no-store',
        },
      });
    }

    // Geen Range-header → stuur het hele bestand
    return new NextResponse(streamToReadable(filePath), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(totalSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('[Video] read error:', err);
    return NextResponse.json({ error: 'Leesfout' }, { status: 500 });
  }
}
