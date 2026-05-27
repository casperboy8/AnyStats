/**
 * Gedeelde opslag-laag voor uploads (bewijs-foto's en -video's).
 *
 * Configuratie via .env.local:
 *   UPLOAD_DIR=/mnt/video/proofs      ← Linux server (aanbevolen)
 *   UPLOAD_DIR=Z:\proofs              ← Windows met gemapte netwerkschijf
 *   (leeg)                            ← fallback naar ./uploads naast de app
 *
 * Voor netwerk-opslag: zorg dat het pad gemount is op OS-niveau en wijs
 * UPLOAD_DIR naar het gemounte pad. De app gebruikt gewone fs-operaties.
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
}

/** Sla een bestand op in UPLOAD_DIR (of ./uploads als fallback). */
export async function writeProof(filename: string, data: Buffer): Promise<void> {
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), data);
}

/** Lees een bestand uit UPLOAD_DIR (of ./uploads als fallback). */
export async function readProof(filename: string): Promise<Buffer> {
  return readFile(path.join(uploadDir(), filename));
}
