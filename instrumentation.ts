/**
 * Next.js instrumentation hook — wordt éénmalig uitgevoerd bij server-opstart.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * We initialiseren hier de WhatsApp-client zodat hij klaar staat zodra de
 * app verzoeken ontvangt. Alleen in de Node.js runtime, niet in Edge.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.WHATSAPP_ENABLED === 'true') {
    const { initWhatsappClient } = await import('./src/lib/whatsapp/client');
    initWhatsappClient();
  }
}
