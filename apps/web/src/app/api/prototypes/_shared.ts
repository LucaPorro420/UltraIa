import { existsSync } from 'node:fs';
import { join } from 'node:path';

// `resultTask/` lives at the repo root. `next dev` runs with cwd = apps/web, so we also
// probe one level up (apps/web -> apps -> repo root) to locate it robustly.
export function resolveRoot(): string {
  const candidates = [
    join(process.cwd(), 'resultTask'),
    join(process.cwd(), '..', '..', 'resultTask'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[1];
}

export const ROOT = resolveRoot();

export const ALLOWED = new Set([
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

export const CONTENT_TYPE: Record<string, string> = {
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

export type ProtoItem = {
  id: string;
  name: string;
  category: string;
  ext: string;
};
