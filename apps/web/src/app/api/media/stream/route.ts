import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { getCurrentUser } from '@/lib/server/context';

const MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.srt': 'text/plain',
  '.vtt': 'text/vtt',
};

/** Allowed root directories for media serving (security: prevent path traversal). */
const ALLOWED_ROOTS = [
  '.ultraia',
  'packages/core/prisma',
];

function isPathSafe(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (normalized.startsWith('..') || normalized.startsWith('/')) return false;
  return ALLOWED_ROOTS.some((root) => normalized.startsWith(root));
}

/**
 * GET /api/media/stream?path=.ultraia/content/brief-xxx/narracion.mp3
 *
 * Streams a local media file with proper Content-Type and range support.
 * Requires authentication.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const filePath = url.searchParams.get('path');
  if (!filePath) {
    return NextResponse.json({ error: 'Missing ?path= parameter' }, { status: 400 });
  }

  // Security: validate path
  if (!isPathSafe(filePath)) {
    return NextResponse.json({ error: 'Path not allowed' }, { status: 403 });
  }

  // Resolve absolute path from project root
  // In Next.js standalone, cwd is the .next standalone dir; adjust if needed
  const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();
  const absolutePath = join(projectRoot, filePath);

  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 404 });
    }

    const ext = extname(absolutePath).toLowerCase();
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';

    // Range request support for video/audio
    const range = req.headers.get('range');
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileStat.size - 1;
      const chunkSize = end - start + 1;

      const buffer = await readFile(absolutePath);
      return new NextResponse(buffer.subarray(start, end + 1), {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Full file
    const buffer = await readFile(absolutePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Length': String(buffer.length),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
