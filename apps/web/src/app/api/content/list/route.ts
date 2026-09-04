//! GET /api/content/list — list all generated content files with metadata.
import { getCurrentUser } from '@/lib/server/context';
import { listContentFiles, getContentStats, readContentFile } from '@ultraia/core';

/**
 * GET /api/content/list
 *
 * List all generated content files with metadata.
 * Auth: any authenticated user.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const filePath = url.searchParams.get('path');

  if (filePath) {
    // Read single file
    const file = await readContentFile(filePath);
    if (!file) {
      return Response.json({ error: 'File not found' }, { status: 404 });
    }
    return Response.json({ file });
  }

  // List all files + stats
  const [files, stats] = await Promise.all([
    listContentFiles(),
    getContentStats(),
  ]);

  return Response.json({
    files: files.map((f) => ({
      path: f.path,
      meta: f.meta,
    })),
    stats,
  });
}
