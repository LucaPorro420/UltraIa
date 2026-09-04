import { z } from 'zod';
import { spawnSync } from 'node:child_process';
import { fetchWebContent, planWebHarvestArgv } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { sanitizeError } from '@/lib/server/sanitize-error';

const bodySchema = z.object({
  url: z.string().url(),
  /** auto (default) = remoto primero + fallback webharvest local · local = solo CLI OSS. */
  engine: z.enum(['auto', 'local']).default('auto'),
});

interface WebPayload {
  title: string | null;
  description: string | null;
  ogImage: string | null;
  text: string;
  finalUrl: string;
  engine?: 'remote' | 'webharvest';
}

/** Markdown del CLI → forma WebContent (título desde el primer heading). */
function markdownToWebPayload(markdown: string, url: string): WebPayload {
  const text = markdown.replace(/\r\n/g, '\n').trim();
  const h1 = text.match(/^#\s+(.+)$/m)?.[1] ?? null;
  return {
    title: h1 ? h1.trim() : null,
    description: null,
    ogImage: null,
    text,
    finalUrl: url,
    engine: 'webharvest',
  };
}

/** Ejecuta los candidatos argv de webharvest; devuelve el primer stdout útil. */
function runWebHarvest(url: string): { ok: true; payload: WebPayload; tried: number } | { ok: false; error: string; tried: number } {
  const { candidates, timeoutMs } = planWebHarvestArgv(url);
  let lastError = 'webharvest no disponible';
  for (let i = 0; i < candidates.length; i++) {
    const argv = candidates[i];
    try {
      const run = spawnSync(argv[0], argv.slice(1), {
        timeout: timeoutMs,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      });
      if (run.status === 0 && run.stdout && run.stdout.trim().length > 40) {
        return { ok: true, payload: markdownToWebPayload(run.stdout, url), tried: i + 1 };
      }
      if (run.error) lastError = run.error.message;
      else if (run.stderr) lastError = run.stderr.split('\n')[0].slice(0, 200);
    } catch (err) {
      lastError = (err as Error).message;
    }
  }
  return { ok: false, error: 'Web fetch failed after all attempts', tried: candidates.length };
}

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });
  const { url, engine } = parsed.data;

  // Motor Local (OSS): solo CLI webharvest, fail-soft instructivo.
  if (engine === 'local') {
    const r = runWebHarvest(url);
    if (!r.ok) {
      return Response.json(
        { error: 'Web fetch failed', hint: 'Instala el scraper local: pip install webharvest', tried: r.tried },
        { status: 503 },
      );
    }
    return Response.json(r.payload);
  }

  // Auto: remoto primero (keyless r.jina.ai); fallback OSS local antes de fallar.
  try {
    const data = await fetchWebContent(url);
    return Response.json({ ...data, engine: 'remote' });
  } catch (remoteErr) {
    const r = runWebHarvest(url);
    if (r.ok) return Response.json(r.payload);
    return new Response('Web fetch failed', { status: 502 });
  }
}
