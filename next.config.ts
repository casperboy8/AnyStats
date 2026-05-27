import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Voorkom dat Next.js whatsapp-web.js en puppeteer bundelt —
  // ze moeten at-runtime via require() worden geladen (Node.js only).
  serverExternalPackages: [
    'whatsapp-web.js',
    'puppeteer',
    'puppeteer-core',
    '@marsaud/smb2',
    'better-sqlite3',
  ],
};

export default nextConfig;
