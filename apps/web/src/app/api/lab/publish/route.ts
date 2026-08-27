import { getCurrentUser } from '@/lib/server/context';
import { CloudService, isSafePath } from '@ultraia/cloud';
import { createDefaultPublishers } from '@ultraia/core';
import { localCloudAdapter } from '../../cloud/providers';
import { Buffer } from 'node:buffer';

const service = () => new CloudService({ adapter: localCloudAdapter() });

export const runtime = 'nodejs';

/** Canales que aceptan imagen directa (los demás son video-only en el pipeline AutoPub). */
const IMAGE_CHANNELS = new Set(['telegram', 'discord']);

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  let body: { path?: string; channel?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const path = body.path;
  const channel = body.channel;
  if (!path || !channel) return new Response('path y channel requeridos', { status: 400 });
  if (!IMAGE_CHANNELS.has(channel)) return new Response('canal no soporta imagen', { status: 400 });
  if (!isSafePath(path)) return new Response('invalid path', { status: 400 });

  const data = await service().adapter.read(path);
  if (!data) return new Response('not found', { status: 404 });
  const meta = await service().stat(path);
  const name = meta?.name ?? path.split('/').pop() ?? 'design';
  const buf = Buffer.from(data);

  const publishers = createDefaultPublishers({
    includeTelegram: channel === 'telegram',
    includeDiscord: channel === 'discord',
  });
  const adapter = publishers.find((p) => p.platform === channel);
  if (!adapter) return new Response('adapter no disponible', { status: 500 });

  const result = await adapter.publish({
    imageBuffer: buf,
    imageName: name,
    metadata: { title: name, description: 'Diseño publicado desde UltraIa Lab' },
  });

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
}
