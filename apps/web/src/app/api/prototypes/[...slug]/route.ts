import { NextResponse } from 'next/server';
import { join, extname, sep } from 'node:path';
import { readFile } from 'node:fs/promises';

const ROOT = join(process.cwd(), 'resultTask');

const ALLOWED = new Set([
  '.html',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gltf',
  '.obj',
  '.mp4',
  '.webm',
]);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gltf': 'model/gltf+json',
  '.obj': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const rel = (slug ?? []).join('/');

  // Anti path-traversal: rechaza segmentos '..' y cualquier ruta que salga de ROOT.
  if (rel.split('/').some((s) => s === '..' || s === '')) {
    return new NextResponse('bad request', { status: 400 });
  }
  const full = join(ROOT, rel);
  if (!full.startsWith(ROOT + sep)) {
    return new NextResponse('forbidden', { status: 403 });
  }

  const ext = extname(full).toLowerCase();
  if (!ALLOWED.has(ext)) {
    return new NextResponse('forbidden', { status: 403 });
  }

  try {
    const data = await readFile(full);
    return new NextResponse(data, {
      headers: {
        'Content-Type': TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('not found', { status: 404 });
  }
}
