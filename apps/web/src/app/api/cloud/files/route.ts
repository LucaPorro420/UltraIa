import { getCurrentUser } from '@/lib/server/context';
import { CloudService } from '@ultraia/cloud';
import { localCloudAdapter } from '../providers';

const service = () => new CloudService({ adapter: localCloudAdapter() });

/** GET /api/cloud/files?base= — lista archivos + manifest agregado. */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const base = searchParams.get('base') || undefined;

  const [files, manifest] = await Promise.all([service().list(base), service().manifest(base)]);
  return Response.json({ files, manifest, base: base ?? '/' });
}

/** DELETE /api/cloud/files — body { path } → borra (fail-soft). */
export async function DELETE(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = (await req.json().catch(() => null)) as { path?: string } | null;
  const path = body?.path;
  if (!path) return new Response('path requerido', { status: 400 });

  try {
    const removed = await service().remove(path);
    return Response.json({ removed, path });
  } catch (err) {
    return Response.json({ error: 'error' }, { status: 400 });
  }
}