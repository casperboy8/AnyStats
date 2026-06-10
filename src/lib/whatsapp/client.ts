/**
 * WhatsApp client singleton voor AnyStats.
 *
 * Eén WhatsApp-nummer voor de hele applicatie, beheerd door de admin.
 * De sessie wordt opgeslagen zodat na een server-herstart niet opnieuw
 * via QR-code gekoppeld hoeft te worden.
 */

import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

export type WhatsappStatus = 'initializing' | 'qr_needed' | 'connected' | 'disconnected';

// Singleton state — global zodat hot reload in dev de client niet herstelt
declare global {
  var __wa_client: Client | undefined;
  var __wa_status: WhatsappStatus;
  var __wa_qr: string | null;
  var __wa_phone: string | null;
  var __wa_init: boolean;
  var __wa_error: string | null;
  var __wa_shutdown_registered: boolean;
}

globalThis.__wa_status ??= 'disconnected';
globalThis.__wa_qr ??= null;
globalThis.__wa_phone ??= null;
globalThis.__wa_init ??= false;
globalThis.__wa_error ??= null;
globalThis.__wa_shutdown_registered ??= false;

export function getWhatsappClient(): Client | null {
  return globalThis.__wa_client ?? null;
}

export function getWhatsappStatus(): {
  status: WhatsappStatus;
  qr: string | null;
  phoneNumber: string | null;
  error: string | null;
} {
  return {
    status: globalThis.__wa_status,
    qr: globalThis.__wa_qr,
    phoneNumber: globalThis.__wa_phone,
    error: globalThis.__wa_error,
  };
}

/** Zoek het Puppeteer Chrome-executable op */
function findChromePath(): string | undefined {
  // 1. Puppeteer's eigen cache (~/.cache/puppeteer/chrome/...)
  const puppeteerCacheDir = path.join(
    process.env.USERPROFILE ?? process.env.HOME ?? '',
    '.cache', 'puppeteer', 'chrome'
  );
  if (fs.existsSync(puppeteerCacheDir)) {
    const builds = fs.readdirSync(puppeteerCacheDir).filter(f => f.startsWith('win64-') || f.startsWith('linux-') || f.startsWith('mac-'));
    for (const build of builds.sort().reverse()) {
      const candidates = [
        path.join(puppeteerCacheDir, build, 'chrome-win64', 'chrome.exe'),
        path.join(puppeteerCacheDir, build, 'chrome-linux64', 'chrome'),  // nieuwere Puppeteer versies
        path.join(puppeteerCacheDir, build, 'chrome-linux', 'chrome'),    // oudere Puppeteer versies
        path.join(puppeteerCacheDir, build, 'chrome-mac', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
    }
  }

  // 2. Geïnstalleerd Chrome op Windows
  const windowsPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  for (const p of windowsPaths) {
    if (fs.existsSync(p)) return p;
  }

  // 3. Geïnstalleerd Chrome op Linux/macOS
  const unixPaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const p of unixPaths) {
    if (fs.existsSync(p)) return p;
  }

  return undefined;
}

export function initWhatsappClient(): void {
  if (globalThis.__wa_init) return;
  globalThis.__wa_init = true;
  globalThis.__wa_status = 'initializing';
  globalThis.__wa_error = null;

  const sessionPath = process.env.WHATSAPP_SESSION_PATH ?? './whatsapp-session';
  const chromePath = findChromePath();

  if (!chromePath) {
    const msg = 'Chrome niet gevonden. Voer uit: npx puppeteer browsers install chrome';
    console.error('[WhatsApp]', msg);
    globalThis.__wa_status = 'disconnected';
    globalThis.__wa_error = msg;
    globalThis.__wa_init = false;
    return;
  }

  console.log('[WhatsApp] Chrome gevonden:', chromePath);

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'anystats',
      dataPath: sessionPath,
    }),
    puppeteer: {
      headless: true,
      executablePath: chromePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    },
  });

  globalThis.__wa_client = client;

  client.on('qr', async (qr) => {
    console.log('[WhatsApp] QR-code beschikbaar — scan met de WhatsApp-app');
    qrcodeTerminal.generate(qr, { small: true });
    globalThis.__wa_status = 'qr_needed';
    globalThis.__wa_error = null;
    try {
      globalThis.__wa_qr = await QRCode.toDataURL(qr);
    } catch (err) {
      console.error('[WhatsApp] QR PNG genereren mislukt:', err);
    }
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Geauthenticeerd');
    globalThis.__wa_qr = null;
    globalThis.__wa_error = null;
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Authenticatie mislukt:', msg);
    globalThis.__wa_status = 'disconnected';
    globalThis.__wa_qr = null;
    globalThis.__wa_error = `Authenticatie mislukt: ${msg}`;
    globalThis.__wa_init = false;
  });

  client.on('ready', () => {
    const info = client.info;
    globalThis.__wa_status = 'connected';
    globalThis.__wa_qr = null;
    globalThis.__wa_error = null;
    globalThis.__wa_phone = info?.wid?.user ? `+${info.wid.user}` : null;
    console.log(`[WhatsApp] Verbonden als ${globalThis.__wa_phone ?? 'onbekend nummer'}`);
  });

  client.on('disconnected', (reason) => {
    console.warn('[WhatsApp] Verbinding verbroken:', reason);
    globalThis.__wa_status = 'disconnected';
    globalThis.__wa_phone = null;
    globalThis.__wa_error = `Verbinding verbroken: ${reason}`;
    globalThis.__wa_init = false;
  });

  // Graceful shutdown: destroy client netjes bij SIGTERM/SIGINT zodat
  // WhatsApp de sessie bewaart en na herstart geen nieuwe QR nodig is.
  if (!globalThis.__wa_shutdown_registered) {
    globalThis.__wa_shutdown_registered = true;

    const shutdown = (signal: string) => {
      console.log(`[WhatsApp] ${signal} ontvangen — verbinding netjes verbreken...`);
      const c = globalThis.__wa_client;
      if (c) {
        c.destroy()
          .then(() => console.log('[WhatsApp] Verbinding gesloten'))
          .catch(() => {})
          .finally(() => process.exit(0));
      } else {
        process.exit(0);
      }
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT',  () => shutdown('SIGINT'));
  }

  client.initialize().catch((err: Error) => {
    console.error('[WhatsApp] Initialisatie mislukt:', err.message);
    globalThis.__wa_status = 'disconnected';
    globalThis.__wa_error = `Initialisatie mislukt: ${err.message}`;
    globalThis.__wa_init = false;
  });
}

/**
 * Stuur een WhatsApp-bericht naar een telefoonnummer.
 * Gooit nooit een error — mislukte berichten worden gelogd.
 */
export async function sendWhatsappMessage(phoneNumber: string, message: string): Promise<boolean> {
  const client = globalThis.__wa_client;
  if (!client || globalThis.__wa_status !== 'connected') {
    console.warn('[WhatsApp] Kan bericht niet sturen — client niet verbonden');
    return false;
  }

  try {
    const chatId = phoneNumber.replace(/^\+/, '') + '@c.us';
    await client.sendMessage(chatId, message);
    return true;
  } catch (err) {
    console.error('[WhatsApp] Versturen mislukt naar', phoneNumber, ':', err);
    return false;
  }
}
