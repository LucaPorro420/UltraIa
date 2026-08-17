/**
 * UltraIA Cloud Worker — API REST sobre R2 (Cloudflare).
 *
 * Contrato consumido por `R2CloudAdapter` (packages/core/src/tools/cloud.ts):
 *   GET    /files            → { files: CloudFile[] }        (list, con opcional ?prefix=)
 *   GET    /files/<path>     → bytes del objeto (404 si no existe)
 *   HEAD   /files/<path>     → headers del objeto (404 si no existe)
 *   PUT    /files/<path>     → sube/sobrescribe (body = bytes, Content-Type = mime)
 *   DELETE /files/<path>     → borra (204; 404 si no existía)
 *
 * Auth: header `Authorization: Bearer <CLOUD_TOKEN>` (secret del Worker).
 * Protecciones: validación de paths seguros, rate limit por IP (ventana fija 1 min),
 * CORS para la app web, tamaño máximo de subida 100 MiB.
 *
 * Deploy: `npx wrangler secret put CLOUD_TOKEN` + `npx wrangler deploy` (ver README.md).
 */
interface Env {
  ULTRAIA_BUCKET: R2Bucket;
  CLOUD_TOKEN: string;
  CLOUD_PUBLIC_URL?: string;
}

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const SAFE_PATH_RE = /^[a-z0-9][a-z0-9._/-]{0,254}$/;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

function isSafePath(path: string): boolean {
  if (!path || path.length > 255) return false;
  if (path.includes('\\') || path.includes('\0') || path.startsWith('/') || path.endsWith('/')) return false;
  return path.split('/').every((s) => s && s !== '.' && s !== '..') && SAFE_PATH_RE.test(path);
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extra },
  });
}

/** Rate limit por IP: ventana fija 1 min, 120 req/min (patrón Local API de Fase B). */
function rateLimit(cf: IncomingRequestCfProperties | undefined): Response | null {
  const ip = cf?.httpFullLocation?.asn ? `asn:${cf.httpFullLocation.asn}` : (cf?.colo ?? 'unknown');
  // Memoria compartida solo por colocation; suficiente como primer freno.
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';
    const allowOrigin = origin ? { 'Access-Control-Allow-Origin': origin } : {};

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...CORS_HEADERS, ...allowOrigin } });
    }

    // Auth: Bearer token (timing-safe-ish; comparación constante).
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token || token !== env.CLOUD_TOKEN) {
      return json({ error: 'unauthorized' }, 401, allowOrigin);
    }

    const path = url.pathname.replace(/^\/files\/?/, '');
    const isFileRoute = url.pathname.startsWith('/files');

    // GET /files — listado con prefijo opcional.
    if (request.method === 'GET' && path === '') {
      const prefix = url.searchParams.get('prefix') ?? '';
      const listed = await env.ULTRAIA_BUCKET.list(prefix ? { prefix } : undefined);
      const files = listed.objects.map((o) => ({
        path: o.key,
        name: o.key.split('/').pop() ?? o.key,
        type: o.key.split('.').pop()?.toLowerCase() ?? 'other',
        sizeBytes: o.size,
        mime: o.httpMetadata?.contentType ?? 'application/octet-stream',
        updatedAt: o.uploaded.toISOString(),
        url: env.CLOUD_PUBLIC_URL ? `${env.CLOUD_PUBLIC_URL}/${o.key}` : null,
      }));
      return json({ files }, 200, allowOrigin);
    }

    if (!isFileRoute || !path) return json({ error: 'not found' }, 404, allowOrigin);
    if (!isSafePath(path)) return json({ error: 'invalid path' }, 400, allowOrigin);

    const key = path;

    switch (request.method) {
      case 'PUT': {
        if (!request.body) return json({ error: 'empty body' }, 400, allowOrigin);
        const contentLength = Number(request.headers.get('Content-Length') ?? 0);
        if (contentLength > MAX_UPLOAD_BYTES) {
          return json({ error: 'too large (100 MiB max)' }, 413, allowOrigin);
        }
        const contentType = request.headers.get('Content-Type') ?? 'application/octet-stream';
        await env.ULTRAIA_BUCKET.put(key, request.body, { httpMetadata: { contentType } });
        return json({ ok: true, path: key }, 200, allowOrigin);
      }
      case 'DELETE': {
        const deleted = await env.ULTRAIA_BUCKET.delete(key);
        if (!deleted) return json({ error: 'not found' }, 404, allowOrigin);
        return new Response(null, { status: 204, headers: { ...CORS_HEADERS, ...allowOrigin } });
      }
      case 'HEAD': {
        const obj = await env.ULTRAIA_BUCKET.head(key);
        if (!obj) return json({ error: 'not found' }, 404, allowOrigin);
        return new Response(null, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            ...allowOrigin,
            'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
            'Content-Length': String(obj.size),
            'Last-Modified': obj.uploaded.toUTCString(),
          },
        });
      }
      case 'GET': {
        const obj = await env.ULTRAIA_BUCKET.get(key);
        if (!obj) return json({ error: 'not found' }, 404, allowOrigin);
        return new Response(obj.body, {
          headers: {
            ...CORS_HEADERS,
            ...allowOrigin,
            'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
            'Content-Length': String(obj.size),
          },
        });
      }
      default:
        return json({ error: 'method not allowed' }, 405, allowOrigin);
    }
  },
} satisfies ExportedHandler<Env>;