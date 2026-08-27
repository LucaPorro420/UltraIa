import { getCurrentUser } from '@/lib/server/context';
import { CloudService, isSafePath } from '@ultraia/cloud';
import { publish, getConnection, prisma } from '@ultraia/core';
import { localCloudAdapter } from '../../cloud/providers';
import { Buffer } from 'node:buffer';

const service = () => new CloudService({ adapter: localCloudAdapter() });

export const runtime = 'nodejs';

/** Canales que aceptan imagen directa (los demás son video-only en el pipeline AutoPub). */
const IMAGE_CHANNELS = new Set(['telegram', 'discord', 'slack']);

type SessionCreds = {
  botToken?: string;
  chatId?: string;
  webhookUrl?: string;
  token?: string;
  channel?: string;
};

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  let body: { path?: string; channel?: string; creds?: SessionCreds };
  try {
    body = await req.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const path = body.path;
  const channel = body.channel;
  const creds = body.creds ?? {};
  if (!path || !channel) return new Response('path y channel requeridos', { status: 400 });
  if (!IMAGE_CHANNELS.has(channel)) return new Response('canal no soporta imagen', { status: 400 });
  if (!isSafePath(path)) return new Response('invalid path', { status: 400 });

  const data = await service().adapter.read(path);
  if (!data) return new Response('not found', { status: 404 });
  const meta = await service().stat(path);
  const name = meta?.name ?? path.split('/').pop() ?? 'design';
  const buf = Buffer.from(data);

  // Resolver token: credenciales de sesión > conexión guardada (DB) > env (vía `??` en el adapter).
  const dbConn = await getConnection(prisma, channel).catch(() => null);
  const reliesOnDb = !creds.botToken && !creds.webhookUrl && !creds.token;
  if (reliesOnDb) {
    if (!dbConn) {
      return new Response('no hay credenciales (peca el token en el panel o guarda la conexión)', {
        status: 400,
      });
    }
    // Las conexiones guardadas solo las administra ADMIN; leer el token crudo requiere ADMIN.
    if (user.role !== 'ADMIN') {
      return new Response('Forbidden: se requiere ADMIN para usar conexiones guardadas', { status: 403 });
    }
  }

  const metaChat = (dbConn?.meta?.chatId as string | undefined) ?? undefined;
  const metaSlackChannel = (dbConn?.meta?.channel as string | undefined) ?? undefined;

  let adapter;
  if (channel === 'telegram') {
    adapter = publish.createTelegramAdapter({
      botToken: creds.botToken || dbConn?.accessToken,
      chatId: creds.chatId || metaChat,
    });
  } else if (channel === 'discord') {
    adapter = publish.createDiscordAdapter({
      webhookUrl: creds.webhookUrl || dbConn?.accessToken,
    });
  } else if (channel === 'slack') {
    adapter = publish.createSlackAdapter({
      botToken: creds.token || dbConn?.accessToken,
      channel: creds.channel || metaSlackChannel,
    });
  } else {
    return new Response('adapter no disponible', { status: 500 });
  }

  const result = await adapter.publish({
    imageBuffer: buf,
    imageName: name,
    metadata: { title: name, description: 'Diseño publicado desde UltraIa Lab' },
  });

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
}
