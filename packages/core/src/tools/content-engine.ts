/**
 * content-engine.ts — capability `content-engine`
 *
 * Motor de contenido interno: genera contenido derivado de fuentes existentes
 * (ebooks, cursos, learning paths) para blog, video scripts, social media.
 *
 * Determinista, keyless, sin LLM. Produce archivos en disco con manifest.
 */

import { mkdir, rename, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import {
  generateBlogPost,
  generateVideoScript,
  generateSocialCaption,
  generateThread,
  type ContentSource,
  type DerivedType,
  type DerivedContent,
  type Idioma,
} from './content-templates';
import { ALL_CONTENT_SOURCES } from './content-sources';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export interface GenerateOptions {
  /** Tipo de contenido derivado. */
  type: DerivedType;
  /** Idioma destino. Default 'es'. */
  idioma?: Idioma;
  /** Directorio de salida. Default '.ultraia/content'. */
  dir?: string;
  /** Dry run: no escribe archivos. */
  dryRun?: boolean;
}

export interface GeneratedFile {
  /** Ruta del archivo escrito. */
  path: string;
  /** Contenido derivado. */
  content: DerivedContent;
}

export interface GenerateResult {
  sourceId: string;
  sourceTitle: string;
  type: DerivedType;
  idioma: Idioma;
  files: GeneratedFile[];
  manifestPath: string;
}

/* ------------------------------------------------------------------ */
/* Generador                                                           */
/* ------------------------------------------------------------------ */

export async function generateDerivedContent(
  source: ContentSource,
  options: GenerateOptions,
): Promise<GenerateResult> {
  const { type, idioma = 'es', dir = '.ultraia/content', dryRun = false } = options;

  // Generar contenido derivado
  let derived: DerivedContent;
  switch (type) {
    case 'blog-post':
      derived = generateBlogPost(source, idioma);
      break;
    case 'video-script':
      derived = generateVideoScript(source, idioma);
      break;
    case 'social-caption':
      derived = generateSocialCaption(source, idioma);
      break;
    case 'thread':
      derived = generateThread(source, idioma);
      break;
    default:
      throw new Error(`Unknown derived type: ${type}`);
  }

  // Generar archivos
  const files: GeneratedFile[] = [];
  const ext = type === 'blog-post' ? '.md' : type === 'video-script' ? '.md' : '.txt';
  const subdir = type === 'blog-post' ? 'blog' : type === 'video-script' ? 'scripts' : 'social';
  const filename = `${source.id}-${type}-${idioma}${ext}`;
  const filepath = path.join(dir, subdir, filename);

  const file: GeneratedFile = { path: filepath, content: derived };
  files.push(file);

  // Escribir archivos (idempotente)
  if (!dryRun) {
    const content = serializeContent(derived);
    await writeAtomic(filepath, content);
  }

  // Manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceId: source.id,
    sourceTitle: source.title,
    type,
    idioma,
    files: files.map((f) => ({ path: f.path, wordCount: f.content.wordCount })),
    totalWordCount: derived.wordCount,
  };
  const manifestPath = path.join(dir, 'manifest.json');

  if (!dryRun) {
    await writeAtomic(manifestPath, JSON.stringify(manifest, null, 2));
  }

  return {
    sourceId: source.id,
    sourceTitle: source.title,
    type,
    idioma,
    files,
    manifestPath,
  };
}

/* ------------------------------------------------------------------ */
/* Batch generation                                                    */
/* ------------------------------------------------------------------ */

export interface BatchOptions {
  types: DerivedType[];
  idiomas?: Idioma[];
  dir?: string;
  dryRun?: boolean;
}

export interface BatchResult {
  sources: GenerateResult[];
  totalFiles: number;
  totalWords: number;
}

export async function generateBatch(
  sources: ContentSource[],
  options: BatchOptions,
): Promise<BatchResult> {
  const { types, idiomas = ['es'], dir = '.ultraia/content', dryRun = false } = options;
  const results: GenerateResult[] = [];
  let totalFiles = 0;
  let totalWords = 0;

  for (const source of sources) {
    for (const type of types) {
      for (const idioma of idiomas) {
        const result = await generateDerivedContent(source, {
          type,
          idioma,
          dir,
          dryRun,
        });
        results.push(result);
        totalFiles += result.files.length;
        totalWords += result.files.reduce((sum, f) => sum + f.content.wordCount, 0);
      }
    }
  }

  return { sources: results, totalFiles, totalWords };
}

/* ------------------------------------------------------------------ */
/* Serialización                                                       */
/* ------------------------------------------------------------------ */

function serializeContent(content: DerivedContent): string {
  return [
    `---`,
    `type: ${content.type}`,
    `sourceId: ${content.sourceId}`,
    `title: ${content.title}`,
    `idioma: ${content.idioma}`,
    `wordCount: ${content.wordCount}`,
    `estimatedReadMin: ${content.estimatedReadMin}`,
    `tags: [${content.tags.join(', ')}]`,
    `---`,
    '',
    content.body,
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Escritura atómica                                                   */
/* ------------------------------------------------------------------ */

async function writeAtomic(filepath: string, content: string): Promise<void> {
  const dir = path.dirname(filepath);
  await mkdir(dir, { recursive: true });
  const tmp = `${filepath}.tmp.${Date.now()}`;
  await writeFile(tmp, content, 'utf-8');
  await rename(tmp, filepath);
}
