/**
 * Memory filesystem para agentes — patrón Fable-5 (Anthropic).
 *
 * Implementación ORIGINAL de los conceptos del system prompt público de Claude Fable 5
 * (fuente: https://github.com/asgeirtj/system_prompts_leaks — investigación, sin código
 * copiado; ver docs/RAZONAMIENTO-FABLE5.md).
 *
 * Conceptos portados:
 * - Archivos de memoria con frontmatter (name/description/sources/aliases) + líneas con
 *   tags [stated] / [observed] / [inferred].
 * - Operaciones: list / read / write / append / strReplace / delete.
 * - Version guards (ifVersion): escritura optimista — si el archivo cambió desde la última
 *   lectura, la operación falla con MemoryConflictError (releer antes de escribir).
 * - strReplace exige match ÚNICO (0 o varios matches → error).
 * - Una ficha por sujeto (paths por dominio: topics/, people/, areas/, preferences, profile).
 * - Persistencia opcional a disco con escritura atómica (tmp + rename).
 *
 * Keyless-first, sin dependencias nuevas. Hash FNV-1a (patrón briefId del enrutador).
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type MemoryTag = 'stated' | 'observed' | 'inferred';

export interface MemoryLine {
  tag: MemoryTag;
  text: string;
}

export interface MemoryFileMeta {
  /** Path normalizado sin extensión: `profile`, `topics/food`, `people/sam`. */
  path: string;
  /** Slug único del archivo (stem del path). */
  name: string;
  /** Una línea: qué cubre y cuándo leerlo. */
  description: string;
  /** Superficies que escribieron el archivo (ej. ['chat']). */
  sources: string[];
  /** Nombres alternativos por los que se busca el archivo. */
  aliases: string[];
}

export interface MemoryFile extends MemoryFileMeta {
  lines: MemoryLine[];
  /** Contenido serializado crudo (frontmatter + líneas). */
  content: string;
  /** Hash FNV-1a del contenido — token de versión para guards. */
  version: string;
  updatedAt: string;
}

export type MemoryListEntry = Pick<MemoryFileMeta, 'path' | 'description' | 'aliases'>;

export interface FsLike {
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, content: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
}

export interface MemoryFsOptions {
  /** Directorio de persistencia; si se omite, la memoria vive solo en el proceso. */
  baseDir?: string;
  /** Filesystem inyectable (tests). Default: node:fs/promises. */
  fs?: FsLike;
  /** Reloj inyectable (tests). */
  now?: () => string;
}

export interface MemoryWriteInput {
  name?: string;
  description?: string;
  sources?: string[];
  aliases?: string[];
  /** Líneas: texto crudo (tag [stated] implícito) o `[tag] texto` explícito. */
  lines: string[];
}

export interface MemoryWriteResult {
  version: string;
  updatedAt: string;
}

const DEFAULT_SOURCES = ['chat'];
const MAX_PATH_SEGMENTS = 3;
const MAX_PATH_CHARS = 60;
const MAX_LINE_CHARS = 2000;
const MAX_FILE_BYTES = 64 * 1024;
const MAX_LINES = 500;
const VALID_TAGS: MemoryTag[] = ['stated', 'observed', 'inferred'];

/* ------------------------------------------------------------------ */
/* Errores tipados                                                     */
/* ------------------------------------------------------------------ */

export class MemoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryError';
  }
}
export class MemoryNotFoundError extends MemoryError {
  constructor(path: string) {
    super(`memoria no encontrada: "${path}" (usar memory_list o memory_write para crearla)`);
    this.name = 'MemoryNotFoundError';
  }
}
export class MemoryConflictError extends MemoryError {
  constructor(path: string, currentVersion: string) {
    super(`el archivo de memoria "${path}" cambió (version ${currentVersion}); releer antes de escribir (ifVersion)`);
    this.name = 'MemoryConflictError';
  }
}
export class MemoryAmbiguousError extends MemoryError {
  constructor(path: string, matches: number) {
    super(`oldStr debe coincidir exactamente 1 vez en "${path}" (encontradas ${matches}); ampliar oldStr con contexto`);
    this.name = 'MemoryAmbiguousError';
  }
}
export class MemoryValidationError extends MemoryError {
  constructor(message: string) {
    super(`memoria inválida: ${message}`);
    this.name = 'MemoryValidationError';
  }
}

/* ------------------------------------------------------------------ */
/* Hash FNV-1a (patrón briefId del enrutador)                          */
/* ------------------------------------------------------------------ */

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(6, '0');
}

/* ------------------------------------------------------------------ */
/* Normalización de paths                                              */
/* ------------------------------------------------------------------ */

/** Normaliza `topics/food.md`, ` topics/food ` → `topics/food`. Rechaza rutas inseguras. */
export function normalizeMemoryPath(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const noExt = trimmed.endsWith('.md') ? trimmed.slice(0, -3) : trimmed;
  if (!noExt) throw new MemoryValidationError('path vacío');
  if (noExt.startsWith('/') || noExt.includes('\\')) throw new MemoryValidationError(`path absoluto o con backslash: "${raw}"`);
  const segments = noExt.split('/');
  if (segments.length > MAX_PATH_SEGMENTS) throw new MemoryValidationError(`máximo ${MAX_PATH_SEGMENTS} segmentos: "${raw}"`);
  if (noExt.length > MAX_PATH_CHARS) throw new MemoryValidationError(`path > ${MAX_PATH_CHARS} chars: "${raw}"`);
  for (const seg of segments) {
    if (!seg) throw new MemoryValidationError(`segmento vacío en "${raw}"`);
    if (seg === '.' || seg === '..') throw new MemoryValidationError(`segmento inseguro "${seg}" en "${raw}"`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(seg)) throw new MemoryValidationError(`segmento "${seg}" debe ser [a-z0-9-] (sin espacios ni caracteres especiales)`);
  }
  return noExt;
}

/* ------------------------------------------------------------------ */
/* Serialización (frontmatter YAML mínimo + líneas con tags)           */
/* ------------------------------------------------------------------ */

export function serializeMemoryFile(meta: MemoryFileMeta, lines: MemoryLine[]): string {
  const yaml = [
    '---',
    `name: ${meta.name}`,
    `description: ${meta.description}`,
    `sources: [${meta.sources.join(', ')}]`,
    `aliases: [${meta.aliases.join(', ')}]`,
    '---',
  ].join('\n');
  const body = lines.map((l) => `- [${l.tag}] ${l.text}`).join('\n');
  return `${yaml}\n${body}\n`;
}

function parseYamlList(raw: string): string[] {
  const inner = raw.trim().replace(/^\[/, '').replace(/\]$/, '');
  if (!inner) return [];
  return inner
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseMemoryFile(text: string, path: string): MemoryFile {
  if (text.length > MAX_FILE_BYTES) throw new MemoryValidationError(`archivo > ${MAX_FILE_BYTES / 1024} KB`);
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) throw new MemoryValidationError('frontmatter faltante (--- name/description/sources/aliases ---)');
  const meta: Record<string, string | string[]> = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = kv[1];
    const value = kv[2].trim();
    if (key === 'sources' || key === 'aliases') meta[key] = parseYamlList(value);
    else meta[key] = value;
  }
  if (typeof meta.name !== 'string' || !meta.name) throw new MemoryValidationError('frontmatter sin name');
  if (typeof meta.description !== 'string' || !meta.description) throw new MemoryValidationError('frontmatter sin description');
  const lines: MemoryLine[] = [];
  const body = m[2] ?? '';
  for (const rawLine of body.split('\n')) {
    const t = /^- \[([a-z]+)\]\s?(.*)$/.exec(rawLine.trim());
    if (t) {
      const tag = t[1] as MemoryTag;
      if (!VALID_TAGS.includes(tag)) throw new MemoryValidationError(`tag inválido "${t[1]}"`);
      lines.push({ tag, text: t[2] });
    } else if (rawLine.trim()) {
      // Línea sin tag → [stated] (default Fable-5: solo el usuario declara hechos); el bullet es sintaxis de lista, se quita
      lines.push({ tag: 'stated', text: rawLine.trim().replace(/^-\s+/, '') });
    }
  }
  if (lines.length > MAX_LINES) throw new MemoryValidationError(`máximo ${MAX_LINES} líneas`);
  return {
    path,
    name: String(meta.name),
    description: String(meta.description),
    sources: (meta.sources as string[]) ?? DEFAULT_SOURCES,
    aliases: (meta.aliases as string[]) ?? [],
    lines,
    content: text,
    version: fnv1a(text),
    updatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Líneas                                                              */
/* ------------------------------------------------------------------ */

function normalizeLines(raw: string[]): MemoryLine[] {
  if (raw.length > MAX_LINES) throw new MemoryValidationError(`máximo ${MAX_LINES} líneas`);
  return raw.map((line) => {
    if (line.length > MAX_LINE_CHARS) throw new MemoryValidationError(`línea > ${MAX_LINE_CHARS} chars`);
    const t = /^\[([a-z]+)\]\s?(.*)$/.exec(line.trim());
    if (t && VALID_TAGS.includes(t[1] as MemoryTag)) {
      return { tag: t[1] as MemoryTag, text: t[2] };
    }
    return { tag: 'stated', text: line.trim() };
  });
}

/* ------------------------------------------------------------------ */
/* MemoryFs                                                            */
/* ------------------------------------------------------------------ */

const realFs: FsLike = {
  readFile: async (p) => {
    try {
      return await readFile(p, 'utf8');
    } catch {
      return null;
    }
  },
  writeFile: async (p, c) => writeFile(p, c, 'utf8'),
  rename: async (a, b) => rename(a, b),
};

export function createMemoryFs(options: MemoryFsOptions = {}): MemoryFs {
  const baseDir = options.baseDir;
  const fs = options.fs ?? realFs;
  const now = options.now ?? (() => new Date().toISOString());
  const cache = new Map<string, MemoryFile>();

  function filePath(path: string): string {
    if (!baseDir) throw new MemoryError('persistencia no configurada (baseDir ausente)');
    return join(baseDir, `${path}.md`);
  }

  async function load(path: string): Promise<MemoryFile | null> {
    const cached = cache.get(path);
    if (cached) return cached;
    if (!baseDir) return null;
    const text = await fs.readFile(filePath(path));
    if (text === null) return null;
    const file = parseMemoryFile(text, path);
    cache.set(path, file);
    return file;
  }

  async function save(path: string, file: MemoryFile): Promise<string> {
    const content = serializeMemoryFile(file, file.lines);
    const version = fnv1a(content);
    if (baseDir) {
      const dest = filePath(path);
      const tmp = `${dest}.${version}.tmp`;
      await mkdir(dirname(dest), { recursive: true });
      await fs.writeFile(tmp, content);
      await fs.rename(tmp, dest); // atómico + idempotente
    }
    const updated: MemoryFile = { ...file, content, version, updatedAt: now() };
    cache.set(path, updated);
    return version;
  }

  function checkVersion(file: MemoryFile | null, ifVersion: string | undefined, path: string): void {
    if (ifVersion === undefined) return;
    if (!file) throw new MemoryNotFoundError(path);
    if (file.version !== ifVersion) throw new MemoryConflictError(path, file.version);
  }

  return {
    async list(): Promise<MemoryListEntry[]> {
      if (baseDir) {
        // Reconciliar disco: los archivos escritos por otras superficies deben aparecer.
        const { readdir } = await import('node:fs/promises');
        try {
          const names = await readdir(baseDir, { recursive: true });
          for (const name of names) {
            if (typeof name === 'string' && name.endsWith('.md')) {
              const diskPath = name.replace(/\\/g, '/'); // Windows: readdir devuelve backslashes
              const path = normalizeMemoryPath(diskPath);
              if (!cache.has(path))
              await load(path);
            }
          }
        } catch {
          // directorio ausente o vacío → sin entradas extra
        }
      }
      return [...cache.values()]
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((f) => ({ path: f.path, description: f.description, aliases: f.aliases }));
    },

    async read(path: string): Promise<MemoryFile> {
      const p = normalizeMemoryPath(path);
      const file = await load(p);
      if (!file) throw new MemoryNotFoundError(p);
      return file;
    },

    async write(path: string, input: MemoryWriteInput, ifVersion?: string): Promise<MemoryWriteResult> {
      const p = normalizeMemoryPath(path);
      const existing = await load(p);
      checkVersion(existing, ifVersion, p);
      const name = input.name ?? p.split('/').pop() ?? p;
      if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new MemoryValidationError(`name "${name}" debe ser [a-z0-9-]`);
      const meta: MemoryFileMeta = {
        path: p,
        name,
        description: input.description ?? (existing?.description ?? ''),
        sources: input.sources ?? existing?.sources ?? DEFAULT_SOURCES,
        aliases: input.aliases ?? existing?.aliases ?? [],
      };
      const lines = normalizeLines(input.lines);
      const base: MemoryFile = { ...meta, lines, content: '', version: '', updatedAt: '' };
      const version = await save(p, base);
      return { version, updatedAt: now() };
    },

    async append(path: string, line: string, ifVersion?: string): Promise<MemoryWriteResult> {
      const p = normalizeMemoryPath(path);
      const existing = await load(p);
      checkVersion(existing, ifVersion, p);
      const [tag, text] = (() => {
        const t = /^\[([a-z]+)\]\s?(.*)$/.exec(line.trim());
        if (t && VALID_TAGS.includes(t[1] as MemoryTag)) return [t[1] as MemoryTag, t[2]] as const;
        return ['stated', line.trim()] as const;
      })();
      if (text.length > MAX_LINE_CHARS) throw new MemoryValidationError(`línea > ${MAX_LINE_CHARS} chars`);
      if (!existing) {
        // append sobre archivo inexistente → crear con frontmatter mínimo (patrón Fable-5:
        // el primer hecho durable de un sujeto nuevo se archiva este turno)
        return this.write(p, { description: line.slice(0, 80), lines: [line] }, undefined);
      }
      if (existing.lines.length >= MAX_LINES) throw new MemoryValidationError(`máximo ${MAX_LINES} líneas`);
      const lines = [...existing.lines, { tag, text }];
      const version = await save(p, { ...existing, lines });
      return { version, updatedAt: now() };
    },

    async strReplace(path: string, oldStr: string, newStr: string, ifVersion?: string): Promise<MemoryWriteResult> {
      const p = normalizeMemoryPath(path);
      const existing = await load(p);
      checkVersion(existing, ifVersion, p);
      if (!existing) throw new MemoryNotFoundError(p);
      const count = existing.content.split(oldStr).length - 1;
      if (count !== 1) throw new MemoryAmbiguousError(p, count);
      const content = existing.content.replace(oldStr, newStr);
      const file = parseMemoryFile(content, p);
      const version = await save(p, file);
      return { version, updatedAt: now() };
    },

    async delete(path: string, ifVersion?: string): Promise<{ deleted: boolean }> {
      const p = normalizeMemoryPath(path);
      const existing = await load(p);
      checkVersion(existing, ifVersion, p);
      if (!existing) throw new MemoryNotFoundError(p);
      cache.delete(p);
      if (baseDir) {
        const { rm } = await import('node:fs/promises');
        try {
          await rm(filePath(p));
        } catch {
          // ya eliminado en disco
        }
      }
      return { deleted: true };
    },

    async versionOf(path: string): Promise<string | undefined> {
      const p = normalizeMemoryPath(path);
      const file = await load(p);
      return file?.version;
    },
  };
}

export interface MemoryFs {
  list(): Promise<MemoryListEntry[]>;
  read(path: string): Promise<MemoryFile>;
  write(path: string, input: MemoryWriteInput, ifVersion?: string): Promise<MemoryWriteResult>;
  append(path: string, line: string, ifVersion?: string): Promise<MemoryWriteResult>;
  strReplace(path: string, oldStr: string, newStr: string, ifVersion?: string): Promise<MemoryWriteResult>;
  delete(path: string, ifVersion?: string): Promise<{ deleted: boolean }>;
  versionOf(path: string): Promise<string | undefined>;
}