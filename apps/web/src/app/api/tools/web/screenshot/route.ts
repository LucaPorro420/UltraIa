import { z } from 'zod';
import { prisma, slugifyPrompt } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { getStudioCloud } from '@/lib/server/studio-assets';
import { sanitizeError } from '@/lib/server/sanitize-error';

const bodySchema = z.object({
  url: z.string().url(),
  /** Ancho del viewport (px). Alto fijo 800. */
  width: z.number().int().min(480).max(1920).default(1280),
  fullPage: z.boolean().default(false),
});

/**
 * POST /api/tools/web/screenshot — captura REAL de una web → asset de imagen
 * durable. Principio openbrowser (OSS vendoreado): navegador autónomo que
 * extrae estado real; aquí lo aplicamos a "guardar la página como imagen".
 * Fail-soft: sin Chromium instalado responde 503 con el hint de instalación.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });
  const { url, width, fullPage } = parsed.data;

  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      // Pequeña espera de red para imágenes above-the-fold.
      await page.waitForTimeout(1200);
      const buffer = await page.screenshot({ type: 'png', fullPage });

      const cloud = getStudioCloud();
      let host = url;
      try {
        host = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        /* keep raw */
      }
      const name = `${slugifyPrompt(`captura-${host}`)}-${Date.now()}.png`;
      const saved = await cloud.upload(name, new Uint8Array(buffer), 'media/images');

      const asset = await prisma.generatedAsset.create({
        data: {
          userId: user.id,
          prompt: `captura de ${host}`,
          url: '/api/assets/placeholder',
          provider: 'openbrowser',
          model: 'playwright-chromium',
          mediaType: 'image',
          width,
          height: 800,
          storage: 'cloud',
          cloudPath: saved.path,
          metaJson: JSON.stringify({ sourceUrl: url, fullPage }),
        },
      });
      await prisma.generatedAsset.update({ where: { id: asset.id }, data: { url: `/api/assets/${asset.id}` } });
      return Response.json({ ok: true, id: asset.id, url: `/api/assets/${asset.id}` }, { status: 201 });
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch (err) {
    const msg = (err as Error).message ?? '';
    const hint =
      msg.includes('Executable') || msg.includes('browserType.launch')
        ? 'Instala el navegador: npx playwright install chromium'
        : 'No se pudo capturar la página (timeout o bloqueo)';
    return Response.json({ ok: false, error: sanitizeError(err), hint }, { status: 503 });
  }
}

// Nota de bundle: playwright solo se importa dinámicamente en runtime nodejs;
// serverExternalPackages en next.config.ts evita que webpack lo empaquete.
