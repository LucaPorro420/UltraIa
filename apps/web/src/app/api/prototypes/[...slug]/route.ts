import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolveRoot, ALLOWED, CONTENT_TYPE } from '../_shared';
import { join, extname, relative, sep } from 'node:path';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  if (!slug || slug.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const base = resolveRoot();
  const target = join(base, ...slug);

  // Anti path-traversal: the resolved target must stay inside `base`.
  const rel = relative(base, target).split(sep).join('/');
  if (rel.startsWith('..') || rel.startsWith('/') || rel.includes('\\')) {
    return NextResponse.json({ error: 'traversal' }, { status: 400 });
  }

  const ext = extname(target).toLowerCase();
  if (!ALLOWED.has(ext)) {
    return NextResponse.json({ error: 'disallowed_type' }, { status: 415 });
  }

  let buf: Buffer;
  try {
    buf = await readFile(target);
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const ct = CONTENT_TYPE[ext] ?? 'application/octet-stream';
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'content-type': ct,
      'cache-control': 'public, max-age=300',
      'content-disposition': 'inline',
    },
  });
}
