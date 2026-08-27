import { NextResponse } from 'next/server';
import { readdir } from 'node:fs/promises';
import { join, relative, extname, sep } from 'node:path';

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

export type ProtoItem = {
  id: string;
  name: string;
  category: string;
  ext: string;
};

let cache: { at: number; items: ProtoItem[] } | null = null;

async function walk(dir: string, out: ProtoItem[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, out);
      continue;
    }
    const ext = extname(e.name).toLowerCase();
    if (!ALLOWED.has(ext)) continue;
    const rel = relative(ROOT, full).split(sep).join('/');
    const category = rel.split('/')[0] || 'misc';
    out.push({ id: rel, name: e.name, category, ext });
  }
}

export async function GET() {
  if (cache && Date.now() - cache.at < 300_000) {
    return NextResponse.json({ items: cache.items });
  }
  const items: ProtoItem[] = [];
  await walk(ROOT, items);
  items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  cache = { at: Date.now(), items };
  return NextResponse.json({ items });
}
