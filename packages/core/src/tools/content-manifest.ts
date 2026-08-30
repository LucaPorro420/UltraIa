/**
 * content-manifest.ts — Read generated content from disk.
 *
 * Lists manifests, reads individual content files, and provides
 * stats for the content history viewer.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import * as path from 'node:path';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ContentManifest {
  generatedAt: string;
  sourceId: string;
  sourceTitle: string;
  type: string;
  idioma: string;
  files: Array<{ path: string; wordCount: number }>;
  totalWordCount: number;
}

export interface ContentFile {
  /** Relative path from content dir. */
  path: string;
  /** Frontmatter metadata. */
  meta: {
    type: string;
    sourceId: string;
    title: string;
    idioma: string;
    wordCount: number;
    estimatedReadMin: number;
    tags: string[];
  };
  /** Markdown body (without frontmatter). */
  body: string;
  /** Raw file content. */
  raw: string;
}

export interface ContentStats {
  totalManifests: number;
  totalFiles: number;
  totalWords: number;
  byType: Record<string, { count: number; words: number }>;
  byIdioma: Record<string, { count: number; words: number }>;
  bySource: Record<string, { count: number; words: number; title: string }>;
}

/* ------------------------------------------------------------------ */
/* Reader                                                              */
/* ------------------------------------------------------------------ */

/**
 * List all manifest.json files in the content directory.
 */
export async function listManifests(
  dir: string = '.ultraia/content',
): Promise<ContentManifest[]> {
  const manifests: ContentManifest[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(dir, entry.name, 'manifest.json');
      try {
        const raw = await readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(raw) as ContentManifest;
        manifests.push(manifest);
      } catch {
        // No manifest in this subdir, skip
      }
    }
  } catch {
    // Content dir doesn't exist yet
  }

  return manifests.sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  );
}

/**
 * Read a single content file and parse frontmatter + body.
 */
export async function readContentFile(
  filePath: string,
): Promise<ContentFile | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return parseContentFile(filePath, raw);
  } catch {
    return null;
  }
}

/**
 * List all content files across all subdirectories.
 */
export async function listContentFiles(
  dir: string = '.ultraia/content',
): Promise<ContentFile[]> {
  const files: ContentFile[] = [];

  async function walk(currentDir: string, relativeBase: string) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.join(relativeBase, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath, relPath);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.txt')) {
          const file = await readContentFile(fullPath);
          if (file) {
            file.path = relPath;
            files.push(file);
          }
        }
      }
    } catch {
      // Dir doesn't exist
    }
  }

  await walk(dir, '');
  return files;
}

/**
 * Get aggregated stats across all generated content.
 */
export async function getContentStats(
  dir: string = '.ultraia/content',
): Promise<ContentStats> {
  const files = await listContentFiles(dir);
  const manifests = await listManifests(dir);

  const stats: ContentStats = {
    totalManifests: manifests.length,
    totalFiles: files.length,
    totalWords: 0,
    byType: {},
    byIdioma: {},
    bySource: {},
  };

  for (const file of files) {
    stats.totalWords += file.meta.wordCount;

    // By type
    if (!stats.byType[file.meta.type]) {
      stats.byType[file.meta.type] = { count: 0, words: 0 };
    }
    stats.byType[file.meta.type].count++;
    stats.byType[file.meta.type].words += file.meta.wordCount;

    // By idioma
    if (!stats.byIdioma[file.meta.idioma]) {
      stats.byIdioma[file.meta.idioma] = { count: 0, words: 0 };
    }
    stats.byIdioma[file.meta.idioma].count++;
    stats.byIdioma[file.meta.idioma].words += file.meta.wordCount;

    // By source
    if (!stats.bySource[file.meta.sourceId]) {
      stats.bySource[file.meta.sourceId] = { count: 0, words: 0, title: file.meta.sourceId };
    }
    stats.bySource[file.meta.sourceId].count++;
    stats.bySource[file.meta.sourceId].words += file.meta.wordCount;
  }

  return stats;
}

/* ------------------------------------------------------------------ */
/* Parser                                                              */
/* ------------------------------------------------------------------ */

function parseContentFile(filePath: string, raw: string): ContentFile {
  const meta = {
    type: '',
    sourceId: '',
    title: '',
    idioma: 'es',
    wordCount: 0,
    estimatedReadMin: 0,
    tags: [] as string[],
  };

  let body = raw;

  // Parse YAML frontmatter (---...---)
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (fmMatch) {
    const fm = fmMatch[1];
    body = raw.slice(fmMatch[0].length);

    for (const line of fm.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();

      switch (key) {
        case 'type':
          meta.type = value;
          break;
        case 'sourceId':
          meta.sourceId = value;
          break;
        case 'title':
          meta.title = value.replace(/^["']|["']$/g, '');
          break;
        case 'idioma':
          meta.idioma = value;
          break;
        case 'wordCount':
          meta.wordCount = parseInt(value, 10) || 0;
          break;
        case 'estimatedReadMin':
          meta.estimatedReadMin = parseInt(value, 10) || 0;
          break;
        case 'tags':
          meta.tags = value
            .replace(/[\[\]]/g, '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
          break;
      }
    }
  }

  // Extract title from first heading if not in frontmatter
  if (!meta.title) {
    const headingMatch = body.match(/^#\s+(.+)/m);
    if (headingMatch) {
      meta.title = headingMatch[1].trim();
    }
  }

  return { path: filePath, meta, body, raw };
}
