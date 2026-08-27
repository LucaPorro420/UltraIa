import { NextResponse } from 'next/server';
import { readdir } from 'node:fs/promises';
import { relative, extname, sep } from 'node:path';
import { ROOT, ALLOWED, type ProtoItem } from './_shared';

let cache: { at: number; items: ProtoItem[] } | null = null;

async function walk(dir: string, out: ProtoItem[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = `${dir}/${e.name}`;
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
