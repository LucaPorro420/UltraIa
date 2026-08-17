import { z } from 'zod';
import { join } from 'node:path';
import {
  prisma,
  createPublication,
  listPublications,
  canalRequiereAprobacion,
  CloudService,
  LocalCloudAdapter,
  R2CloudAdapter,
} from '@ultraia/core';
import { present, type PresentChannel } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const CANALES = ['youtube_shorts', 'tiktok', 'instagram', 'blog', 'telegram'] as const;

// QUÉ ES: resuelve el CloudService en runtime: R2 (Worker) si está configurado, si no local.
// PARA QUÉ: cada Publication creada se respalda automáticamente en la nube personal.
// POR QUÉ: mismo criterio que resolveCloudAdapter (privado en ai/llm.ts) — replicado aquí.
function resolveCloudService(): CloudService {
  const workerUrl = process.env.CLOUDFLARE_R2_WORKER_URL;
  const token = process.env.CLOUDFLARE_R2_TOKEN;
  const adapter =
    workerUrl && token
      ? new R2CloudAdapter({ baseUrl: workerUrl, token, publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL })
      : new LocalCloudAdapter(process.env.ULTRAIA_CLOUD_DIR ?? join(process.cwd(), '..', '..', '.ultraia', 'cloud'));
  return new CloudService({ adapter });
}

/** GET /api/publications?estado=&canal=&take=&cursor= — lista la cola. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const estadoParam = searchParams.get('estado') || 'ALL';
  const estado = ['DRAFT', 'APPROVED', 'REJECTED', 'PUBLISHED', 'FAILED'].includes(estadoParam)
    ? (estadoParam as 'DRAFT' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'FAILED' | 'ALL')
    : 'ALL';
  const canal = searchParams.get('canal') || undefined;
  const cursor = searchParams.get('cursor') || undefined;
  const take = Math.min(Math.max(Number(searchParams.get('take')) || 20, 1), 100);

  const res = await listPublications(prisma, { estado, canal, take, cursor });
  return Response.json(res);
}

const createSchema = z.object({
  paquete: z.unknown().refine((v) => v !== null && typeof v === 'object', 'paquete requerido'),
  canal: z.enum(CANALES),
  scheduledAt: z.string().datetime().optional().nullable(),
});

/** POST /api/publications — crea una publicación en la cola desde un PublicationPackage. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });
  const { paquete, canal, scheduledAt } = parsed.data;

  // Reconstruye el paquete completo con present() (determinista, keyless) para
  // garantizar captions/hashtags/visual por canal aunque el cliente mande solo tema+contenido.
  const pkg = present({
    tema: (paquete as { tema?: string }).tema ?? 'Sin tema',
    contenido: (paquete as { contenido?: string }).contenido ?? '',
    media: (paquete as { media?: string[] }).media ?? [],
    canales: [canal as PresentChannel],
    briefId: (paquete as { briefId?: string | null }).briefId ?? null,
  });

  const res = await createPublication(prisma, {
    paquete: pkg,
    canal: canal as PresentChannel,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    creadoPorId: user.id,
    cloud: resolveCloudService(), // QUÉ ES: respaldo automático (media + paquete JSON) en la nube personal.
    // PARA QUÉ: AutoPub produce → cloud respalda → cloud-cli.py list lo ve (end-to-end).
    // POR QUÉ: fail-soft — si el cloud falla, la publicación YA se creó y no se revierte.
  });

  return Response.json(
    {
      ...res,
      requiereAprobacion: canalRequiereAprobacion(canal as PresentChannel),
      aviso: res.requiereAprobacion ? 'requiere aprobación humana' : 'aprobada automáticamente',
    },
    { status: 201 },
  );
}