import { CloudService, isSafePath } from '@ultraia/cloud';
import { localCloudAdapter } from '../../api/cloud/providers';

const service = () => new CloudService({ adapter: localCloudAdapter() });

export const runtime = 'nodejs';

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
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
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
