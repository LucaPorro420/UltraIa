import { getCurrentUser } from '@/lib/server/context';
import { CloudService, isSafePath } from '@ultraia/cloud';
import { localCloudAdapter } from '../../providers';

const service = () => new CloudService({ adapter: localCloudAdapter() });

export const runtime = 'nodejs';

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { path } = await ctx.params;
  const rel = path.map((s) => decodeURIComponent(s)).join('/');
  if (!isSafePath(rel)) return new Response('invalid path', { status: 400 });

  const data = await service().adapter.read(rel);
  if (!data) return new Response('not found', { status: 404 });

  const meta = await service().stat(rel);
  const mime = meta?.mime ?? 'application/octet-stream';

  const buf = new Uint8Array(data);
  return new Response(new Blob([buf], { type: mime }), {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
