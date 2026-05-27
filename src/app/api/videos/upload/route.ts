import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getOrgMembership } from '@/lib/org';
import { smbWriteFile, smbMkdir } from '@/lib/smb';
import type { Organisation } from '@/lib/db';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
};

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  // org slug staat als query-parameter: /api/videos/upload?org=<slug>
  const orgSlug = req.nextUrl.searchParams.get('org');
  if (!orgSlug) return NextResponse.json({ error: 'org parameter ontbreekt' }, { status: 400 });

  const org = db.prepare('SELECT * FROM organisations WHERE slug = ?').get(orgSlug) as Organisation | undefined;
  if (!org) return NextResponse.json({ error: 'Organisatie niet gevonden' }, { status: 404 });

  const membership = getOrgMembership(org.id, session.id);
  if (!membership) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Geen bestand meegestuurd' }, { status: 400 });

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `Bestandstype '${file.type}' is niet toegestaan. Gebruik: ${Object.keys(ALLOWED_TYPES).join(', ')}` },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Bestand is te groot (max 500 MB)' }, { status: 413 });
  }

  const videoId = randomUUID();
  const timestamp = Date.now();
  const safeOriginal = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  const storedFilename = `${timestamp}-${safeOriginal}`;
  // Map-structuur op de share: <orgId>/<userId>/
  const remoteDir = `${org.id}\\${session.id}`;
  const remotePath = `${remoteDir}\\${storedFilename}`;

  // Zorg dat de map bestaat
  try {
    await smbMkdir(remoteDir);
  } catch (err) {
    console.error('[SMB] mkdir error:', err);
    return NextResponse.json({ error: 'Kon map niet aanmaken op de netwerkschijf' }, { status: 500 });
  }

  // Schrijf het bestand naar de SMB-share
  try {
    const arrayBuffer = await file.arrayBuffer();
    await smbWriteFile(remotePath, Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('[SMB] writeFile error:', err);
    return NextResponse.json({ error: 'Bestand opslaan mislukt' }, { status: 500 });
  }

  // Sla de metadata op in de database
  db.prepare(`
    INSERT INTO videos (id, organisation_id, uploaded_by, filename, storage_path, file_size_bytes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(videoId, org.id, session.id, file.name, remotePath, file.size);

  return NextResponse.json({ ok: true, id: videoId });
}
