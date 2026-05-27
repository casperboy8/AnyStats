/**
 * SMB-client wrapper voor AnyStats.
 *
 * Video-bestanden worden opgeslagen op een Windows SMB-share via @marsaud/smb2.
 * Credentials komen uit omgevingsvariabelen (nooit hardcoded).
 *
 * Gebruik:
 *   import { smbWriteFile, smbReadFile, smbReadRange, smbFileSize, smbMkdir } from '@/lib/smb';
 */

import SMB2 from '@marsaud/smb2';

interface SmbOptions {
  share: string;
  username: string;
  password: string;
  domain: string;
}

function getOptions(): SmbOptions {
  const host = (process.env.SMB_HOST ?? '').replace(/^\\\\/, '').replace(/\\/g, '');
  const share = process.env.SMB_SHARE ?? '';
  const username = process.env.SMB_USERNAME ?? '';
  const password = process.env.SMB_PASSWORD ?? '';
  const domain = process.env.SMB_DOMAIN ?? '';

  if (!host || !share || !username || !password) {
    throw new Error(
      'SMB-configuratie ontbreekt. Stel SMB_HOST, SMB_SHARE, SMB_USERNAME en SMB_PASSWORD in via .env.local'
    );
  }

  // @marsaud/smb2 gebruikt NTLM-authenticatie en verwacht username en domain
  // als aparte velden. Als SMB_USERNAME in UPN-formaat is (user@domein.local),
  // splits het dan op: username = 'user', domain = 'domein.local'.
  // SMB_DOMAIN overschrijft het UPN-domein als het expliciet is ingesteld.
  let effectiveUsername = username;
  let effectiveDomain = domain;
  if (username.includes('@')) {
    const atIdx = username.lastIndexOf('@');
    effectiveUsername = username.slice(0, atIdx);
    if (!domain) effectiveDomain = username.slice(atIdx + 1);
  }

  return {
    share: `\\\\${host}\\${share}`,
    username: effectiveUsername,
    password,
    domain: effectiveDomain,
  };
}

/**
 * Singleton SMB-client per server-process.
 * globalThis voorkomt dat hot-reload de verbinding vernietigt.
 * Bij een verbindingsfout wordt de client gereset zodat de volgende
 * aanroep automatisch opnieuw verbindt.
 */
const g = globalThis as typeof globalThis & { __smb_client?: SMB2 };

function getClient(): SMB2 {
  if (!g.__smb_client) {
    g.__smb_client = new SMB2({
      ...getOptions(),
      autoCloseTimeout: 300_000, // 5 minuten idle → automatisch sluiten
    });
  }
  return g.__smb_client;
}

function resetClient(): void {
  if (g.__smb_client) {
    try { g.__smb_client.disconnect(); } catch { /* negeer */ }
    g.__smb_client = undefined;
  }
}

/** Schrijf een buffer naar een bestand op de SMB-share. */
export async function smbWriteFile(remotePath: string, data: Buffer): Promise<void> {
  try {
    await getClient().writeFile(remotePath, data);
  } catch (err) {
    resetClient();
    throw err;
  }
}

/**
 * Maak een submap aan (als die nog niet bestaat) en schrijf een bestand —
 * alles in één persistente SMB-verbinding.
 */
export async function smbWriteProof(dir: string, filename: string, data: Buffer): Promise<void> {
  try {
    const client = getClient();
    try {
      await client.mkdir(dir);
    } catch {
      /* map bestaat al — doorgaan */
    }
    await client.writeFile(`${dir}\\${filename}`, data);
  } catch (err) {
    resetClient();
    throw err;
  }
}

/** Lees een volledig bestand van de SMB-share. */
export async function smbReadFile(remotePath: string): Promise<Buffer> {
  try {
    return await getClient().readFile(remotePath);
  } catch (err) {
    resetClient();
    throw err;
  }
}

/**
 * Lees een byte-range van een bestand op de SMB-share via createReadStream.
 * Geeft ook de totale bestandsgrootte terug (via stream.fileSize).
 */
export async function smbReadRange(
  remotePath: string,
  start: number,
  end: number
): Promise<{ data: Buffer; totalSize: number }> {
  try {
    const stream = await getClient().createReadStream(remotePath, { start, end });
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve({ data: Buffer.concat(chunks), totalSize: stream.fileSize }));
      stream.on('error', (err: Error) => { resetClient(); reject(err); });
    });
  } catch (err) {
    resetClient();
    throw err;
  }
}

/**
 * Haal de bestandsgrootte op door een stream te openen en fileSize te lezen.
 * De stream wordt direct gesloten na het ophalen van de grootte.
 */
export async function smbFileSize(remotePath: string): Promise<number> {
  try {
    const stream = await getClient().createReadStream(remotePath, { start: 0, end: 0 });
    return new Promise((resolve, reject) => {
      stream.once('readable', () => { stream.destroy(); resolve(stream.fileSize); });
      stream.on('error', (err: Error) => { resetClient(); reject(err); });
    });
  } catch (err) {
    resetClient();
    throw err;
  }
}

/** Maak een map (inclusief tussenliggende mappen) aan op de SMB-share. */
export async function smbMkdir(remotePath: string): Promise<void> {
  try {
    const client = getClient();
    const parts = remotePath.replace(/\\/g, '/').split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current = current ? `${current}\\${part}` : part;
      try {
        await client.mkdir(current);
      } catch {
        /* map bestaat al — doorgaan */
      }
    }
  } catch (err) {
    resetClient();
    throw err;
  }
}
