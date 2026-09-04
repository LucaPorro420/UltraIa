//! POST /api/cloud/upload — multipart file upload with extension/size validation.
import { getCurrentUser } from '@/lib/server/context';
import { CloudError, CloudService, MAX_UPLOAD_BYTES, humanSize } from '@ultraia/cloud';
import { localCloudAdapter } from '../providers';

const service = () => new CloudService({ adapter: localCloudAdapter() });

/** POST /api/cloud/upload — multipart: file + opcional dir. Valida extensión y tamaño. */
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return new Response('campo "file" requerido (multipart)', { status: 400 });

  if (file.size > MAX_UPLOAD_BYTES) {
    return new Response(`archivo supera el límite de ${humanSize(MAX_UPLOAD_BYTES)}`, { status: 413 });
  }

  const dir = (form?.get('dir') as string | null)?.trim() || undefined;
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const saved = await service().upload(file.name, bytes, dir);
    const [files, manifest] = await Promise.all([service().list(), service().manifest()]);
    return Response.json({ file: saved, files, manifest }, { status: 201 });
  } catch (err) {
    if (err instanceof CloudError) return Response.json({ error: err.message }, { status: 400 });
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}