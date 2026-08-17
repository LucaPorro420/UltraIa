/**
 * UltraIA Cloud — almacenamiento de archivos para agentes y la app web.
 *
 * Dominio puro y determinista (patrón screenflow/video-edit): validaciones de paths y
 * uploads, clasificación por tipo, layout de carpetas, manifest e interfaz de adapters
 * de almacenamiento (local filesystem / R2 vía Worker / in-memory para tests).
 *
 * Keyless-first, sin dependencias nuevas (solo zod + node:fs/promises).
 *
 * La capability `cloud` se registra en ai/llm.ts como tool `cloud_files` (wiring
 * diferido hasta que el working tree de la sesión concurrente #25 esté commiteado;
 * ver STATE.md High Priority). Este módulo exporta `cloudTools` (schema + description)
 * y `createCloudFilesHandler(adapter)` para que el registro sea un añadido trivial.
 */
import { z } from 'zod';
import { mkdir, readFile, writeFile, rename, rm, stat, readdir } from 'node:fs/promises';
import { join, basename, dirname, extname } from 'node:path';

/* ------------------------------------------------------------------ */
/* Tipos y constantes                                                  */
/* ------------------------------------------------------------------ */

export type CloudFileType = 'video' | 'audio' | 'image' | 'document' | 'script' | 'data' | 'other';

export interface CloudFile {
  /** Path canónico relativo a la raíz del cloud: `publications/idea-1.mp4`. */
  path: string;
  /** Nombre del archivo (último segmento). */
  name: string;
  type: CloudFileType;
  sizeBytes: number;
  mime: string;
  updatedAt: string;
  /** URL pública opcional (provider R2 con publicUrl configurado). */
  url?: string | null;
}

export interface CloudLayoutEntry {
  path: string;
  description: string;
}

/** Extensiones admitidas por categoría (validación de uploads). */
export const EXT_TYPES: Readonly<Record<string, CloudFileType>> = Object.freeze({
  // video
  mp4: 'video', mov: 'video', webm: 'video', mkv: 'video', avi: 'video', m4v: 'video',
  // audio
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', flac: 'audio', aac: 'audio',
  // image
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', svg: 'image', avif: 'image',
  // document
  pdf: 'document', md: 'document', txt: 'document', docx: 'document', srt: 'document', vtt: 'document', epub: 'document',
  // script
  py: 'script', ts: 'script', js: 'script', sh: 'script', ps1: 'script', mjs: 'script', cjs: 'script',
  // data
  json: 'data', csv: 'data', yaml: 'data', yml: 'data', xml: 'data', sql: 'data', zip: 'data', tar: 'data', gz: 'data',
});

/** MIME por extensión (fallback `application/octet-stream`). */
export const MIME_BY_EXT: Readonly<Record<string, string>> = Object.freeze({
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac', aac: 'audio/aac',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif',
  pdf: 'application/pdf', md: 'text/markdown', txt: 'text/plain', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  srt: 'application/x-subrip', vtt: 'text/vtt',
  py: 'text/x-python', ts: 'text/typescript', js: 'text/javascript', sh: 'application/x-sh', ps1: 'text/x-powershell', mjs: 'text/javascript', cjs: 'text/javascript',
  json: 'application/json', csv: 'text/csv', yaml: 'text/yaml', yml: 'text/yaml', xml: 'application/xml', sql: 'text/plain',
  zip: 'application/zip', tar: 'application/x-tar', gz: 'application/gzip',
});

export const ALLOWED_EXTENSIONS: readonly string[] = Object.keys(EXT_TYPES);

/** Límite de subida por archivo (100 MiB — la app web local lo maneja sin streaming). */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export const CLOUD_LAYOUT: readonly CloudLayoutEntry[] = Object.freeze([
  { path: 'publications', description: 'Videos finales listos para publicar (cola AutoPub).' },
  { path: 'drafts', description: 'Piezas en edición / borradores de guiones y captions.' },
  { path: 'briefs', description: 'Topic briefs del motor de ideas (F1) exportados.' },
  { path: 'media/videos', description: 'Material de video (grabaciones, clips, master).' },
  { path: 'media/audio', description: 'Narraciones TTS, música, SFX y pistas.' },
  { path: 'media/images', description: 'Thumbnails, posters y visuales por canal.' },
  { path: 'scripts', description: 'ActionScripts de ScreenFlow y guiones de automatización.' },
  { path: 'exports', description: 'Paquetes exportados (manifest, EDL, renders).' },
  { path: 'backups', description: 'Copias de seguridad manuales de la cola y config.' },
]);

/** Regex de path canónico: minúsculas, dígitos, `.` `_` `-` `/`; sin espacios ni separadores de sistema. */
const CLOUD_PATH_RE = /^[a-z0-9][a-z0-9._/-]{0,254}$/;

export class CloudError extends Error {
  constructor(
    public readonly code: 'INVALID_PATH' | 'TOO_LARGE' | 'NOT_FOUND' | 'IO' | 'UNSAFE_PATH' | 'BAD_EXTENSION',
    message: string,
  ) {
    super(message);
    this.name = 'CloudError';
  }
}

/* ------------------------------------------------------------------ */
/* Validación y utilidades puras                                       */
/* ------------------------------------------------------------------ */

/** True si el path relativo es seguro (sin `..`, backslash, nulos, vacíos). */
export function isSafePath(path: string): boolean {
  if (!path || path.length > 255) return false;
  if (path.includes('\\') || path.includes('\0')) return false;
  if (path.startsWith('/') || path.endsWith('/')) return false;
  const segments = path.split('/');
  if (segments.some((s) => !s || s === '.' || s === '..')) return false;
  return CLOUD_PATH_RE.test(path);
}

/** Normaliza un path de entrada a canónico; devuelve null si es inválido. */
export function normalizeCloudPath(input: string): string | null {
  const cleaned = input.trim().replace(/\\/g, '/').replace(/\/+/g, '/');
  return isSafePath(cleaned) ? cleaned : null;
}

/** Sanitiza un nombre de archivo para uso seguro (espacios → guiones, sin separadores). */
export function sanitizeFileName(input: string): string {
  // basename() de node:path depende del OS (win32 trata 'a:' como drive) → split manual.
  const base = input.replace(/\\/g, '/').split('/').pop()?.trim() ?? '';
  if (!base) return 'untitled';
  const cleaned = base
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/-+(?=\.)/g, '')
    .replace(/\.-+/g, '.')
    .replace(/^-+|-+$/g, '')
    .slice(0, 240);
  return cleaned || 'untitled';
}

/** Clasifica un archivo por extensión. */
export function classifyFile(name: string): CloudFileType {
  const ext = extname(name).toLowerCase().replace('.', '');
  return EXT_TYPES[ext] ?? 'other';
}

export interface UploadValidation {
  ok: boolean;
  errors: string[];
  normalizedName: string;
  ext: string;
  type: CloudFileType;
}

/** Valida un upload: nombre sanitizable, extensión admitida y tamaño dentro del límite. */
export function validateUpload(name: string, sizeBytes: number): UploadValidation {
  const errors: string[] = [];
  const normalizedName = sanitizeFileName(name);
  const ext = extname(normalizedName).toLowerCase().replace('.', '');
  const type = classifyFile(normalizedName);
  if (!ext) errors.push('el archivo no tiene extensión (p.ej. .mp4, .pdf, .md)');
  else if (!ALLOWED_EXTENSIONS.includes(ext)) errors.push(`extensión .${ext} no admitida (${ALLOWED_EXTENSIONS.length} permitidas)`);
  if (sizeBytes <= 0) errors.push('el archivo está vacío');
  if (sizeBytes > MAX_UPLOAD_BYTES) errors.push(`supera el límite de ${humanSize(MAX_UPLOAD_BYTES)}`);
  return { ok: errors.length === 0, errors, normalizedName, ext, type };
}

/** Formatea bytes a unidades legibles (binarias KiB/MiB/GiB/TiB). */
export function humanSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'] as const;
  let value = bytes;
  let unit = 'B';
  for (const u of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = u;
  }
  return `${value % 1 === 0 ? Math.round(value) : value.toFixed(1)} ${unit}`;
}

/** Estructura de carpetas sugerida para el cloud (`.ultraia/cloud/`). */
export function planCloudLayout(): CloudLayoutEntry[] {
  return [...CLOUD_LAYOUT];
}

export interface CloudManifest {
  count: number;
  totalBytes: number;
  byType: Partial<Record<CloudFileType, number>>;
  updatedAt: string;
}

/** Índice agregado de un listado de archivos. */
export function buildCloudManifest(files: CloudFile[], now?: () => string): CloudManifest {
  const byType: Partial<Record<CloudFileType, number>> = {};
  let totalBytes = 0;
  for (const f of files) {
    totalBytes += f.sizeBytes;
    byType[f.type] = (byType[f.type] ?? 0) + 1;
  }
  return { count: files.length, totalBytes, byType, updatedAt: (now ?? (() => new Date().toISOString()))() };
}

/* ------------------------------------------------------------------ */
/* Adapters                                                            */
/* ------------------------------------------------------------------ */

export interface CloudStorageAdapter {
  readonly kind: 'local' | 'r2' | 'memory';
  /** Lista todos los archivos (opcionalmente bajo un prefijo de path). */
  list(base?: string): Promise<CloudFile[]>;
  /** Lee el contenido; null si no existe (fail-soft). */
  read(path: string): Promise<Uint8Array | null>;
  /** Escribe/sobrescribe un archivo (crea directorios intermedios). */
  write(path: string, data: Uint8Array, mime: string): Promise<void>;
  /** Borra; false si no existía. */
  remove(path: string): Promise<boolean>;
  /** Metadatos; null si no existe. */
  stat(path: string): Promise<CloudFile | null>;
}

export interface CloudAdapterOptions {
  now?: () => string;
}

/** Adapter en memoria — determinista, para tests y dry-runs. */
export class InMemoryCloudAdapter implements CloudStorageAdapter {
  readonly kind = 'memory' as const;
  private readonly files = new Map<string, { data: Uint8Array; mime: string; updatedAt: string }>();
  private readonly now: () => string;

  constructor(opts: CloudAdapterOptions = {}) {
    this.now = opts.now ?? (() => new Date().toISOString());
  }

  private entry(path: string) {
    const e = this.files.get(path);
    if (!e) return null;
    return { path, name: path.split('/').pop() ?? path, sizeBytes: e.data.byteLength, mime: e.mime, updatedAt: e.updatedAt, type: classifyFile(path) };
  }

  async list(base?: string): Promise<CloudFile[]> {
    const prefix = base ? `${base.replace(/\/$/, '')}/` : '';
    return [...this.files.keys()]
      .filter((p) => (prefix ? p.startsWith(prefix) : true))
      .sort()
      .map((p) => this.entry(p)!);
  }

  async read(path: string): Promise<Uint8Array | null> {
    return this.files.get(path)?.data ?? null;
  }

  async write(path: string, data: Uint8Array, mime: string): Promise<void> {
    if (!isSafePath(path)) throw new CloudError('UNSAFE_PATH', `path inseguro: ${path}`);
    this.files.set(path, { data, mime, updatedAt: this.now() });
  }

  async remove(path: string): Promise<boolean> {
    return this.files.delete(path);
  }

  async stat(path: string): Promise<CloudFile | null> {
    return this.entry(path);
  }
}

/** Adapter sobre el filesystem local (`.ultraia/cloud/`). Escritura atómica tmp+rename. */
export class LocalCloudAdapter implements CloudStorageAdapter {
  readonly kind = 'local' as const;
  private readonly now: () => string;

  constructor(
    public readonly baseDir: string,
    opts: CloudAdapterOptions = {},
  ) {
    this.now = opts.now ?? (() => new Date().toISOString());
  }

  private resolve(path: string): string {
    if (!isSafePath(path)) throw new CloudError('UNSAFE_PATH', `path inseguro: ${path}`);
    return join(this.baseDir, ...path.split('/'));
  }

  async list(base?: string): Promise<CloudFile[]> {
    const root = base ? this.resolve(base.replace(/\/$/, '')) : this.baseDir;
    const out: CloudFile[] = [];
    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > 4) return;
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return; // directorio inexistente → lista vacía (fail-soft)
      }
      for (const e of entries) {
        const full = join(dir, e.name);
        const rel = full.slice(this.baseDir.length).replace(/\\/g, '/').replace(/^\//, '');
        if (e.isDirectory()) await walk(full, depth + 1);
        else if (e.isFile() && isSafePath(rel)) {
          try {
            const st = await stat(full);
            out.push({ path: rel, name: e.name, type: classifyFile(e.name), sizeBytes: st.size, mime: MIME_BY_EXT[extname(e.name).toLowerCase().replace('.', '')] ?? 'application/octet-stream', updatedAt: st.mtime.toISOString() });
          } catch {
            // archivo borrado entre listado y stat → omitir
          }
        }
      }
    };
    await walk(root, 0);
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }

  async read(path: string): Promise<Uint8Array | null> {
    if (!isSafePath(path)) throw new CloudError('UNSAFE_PATH', `path inseguro: ${path}`);
    try {
      return await readFile(this.resolve(path));
    } catch {
      return null;
    }
  }

  async write(path: string, data: Uint8Array, mime: string): Promise<void> {
    const target = this.resolve(path);
    await mkdir(dirname(target), { recursive: true });
    const tmp = `${target}.tmp-${Date.now()}`;
    await writeFile(tmp, data);
    await rename(tmp, target);
  }

  async remove(path: string): Promise<boolean> {
    if (!isSafePath(path)) throw new CloudError('UNSAFE_PATH', `path inseguro: ${path}`);
    try {
      await rm(this.resolve(path), { force: true });
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<CloudFile | null> {
    if (!isSafePath(path)) throw new CloudError('UNSAFE_PATH', `path inseguro: ${path}`);
    try {
      const full = this.resolve(path);
      const st = await stat(full);
      if (!st.isFile()) return null;
      return { path, name: basename(full), type: classifyFile(path), sizeBytes: st.size, mime: MIME_BY_EXT[extname(path).toLowerCase().replace('.', '')] ?? 'application/octet-stream', updatedAt: st.mtime.toISOString() };
    } catch {
      return null;
    }
  }
}

export interface R2AdapterOptions {
  /** Base del Worker de cloud (p.ej. `https://cloud.ultraia.workers.dev`). */
  baseUrl: string;
  /** Token Bearer de acceso al Worker. */
  token: string;
  /** URL pública de archivos (para `url` en CloudFile). */
  publicUrl?: string;
  /** fetch inyectable (tests). Default: global fetch. */
  fetchImpl?: typeof fetch;
  now?: () => string;
}

/**
 * Adapter R2 vía el Worker de cloudflare/ (contrato REST:
 * GET /files, GET /files/:path, PUT /files/:path, DELETE /files/:path, Authorization: Bearer).
 */
export class R2CloudAdapter implements CloudStorageAdapter {
  readonly kind = 'r2' as const;
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly publicUrl?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => string;

  constructor(opts: R2AdapterOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.token = opts.token;
    this.publicUrl = opts.publicUrl?.replace(/\/$/, '');
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.now = opts.now ?? (() => new Date().toISOString());
  }

  private url(path: string): string {
    return `${this.baseUrl}/files${path ? `/${path}` : ''}`;
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await this.fetchImpl(this.url(path), {
        ...init,
        headers: { Authorization: `Bearer ${this.token}`, ...(init?.headers ?? {}) },
      });
    } catch (err) {
      throw new CloudError('IO', `R2 sin conexión (${this.baseUrl}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async list(base?: string): Promise<CloudFile[]> {
    const res = await this.request('');
    if (!res.ok) throw new CloudError('IO', `R2 list ${res.status}`);
    const data = (await res.json()) as { files: CloudFile[] };
    const prefix = base ? `${base.replace(/\/$/, '')}/` : '';
    const files = (data.files ?? []).filter((f) => (prefix ? f.path.startsWith(prefix) : true));
    return this.publicUrl ? files.map((f) => ({ ...f, url: `${this.publicUrl}/${f.path}` })) : files;
  }

  async read(path: string): Promise<Uint8Array | null> {
    if (!isSafePath(path)) throw new CloudError('UNSAFE_PATH', `path inseguro: ${path}`);
    const res = await this.request(path);
    if (res.status === 404) return null;
    if (!res.ok) throw new CloudError('IO', `R2 read ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async write(path: string, data: Uint8Array, mime: string): Promise<void> {
    if (!isSafePath(path)) throw new CloudError('UNSAFE_PATH', `path inseguro: ${path}`);
    const res = await this.request(path, { method: 'PUT', body: Uint8Array.from(data).buffer, headers: { 'Content-Type': mime } });
    if (!res.ok) throw new CloudError('IO', `R2 write ${res.status}`);
  }

  async remove(path: string): Promise<boolean> {
    if (!isSafePath(path)) throw new CloudError('UNSAFE_PATH', `path inseguro: ${path}`);
    const res = await this.request(path, { method: 'DELETE' });
    if (res.status === 404) return false;
    if (!res.ok) throw new CloudError('IO', `R2 remove ${res.status}`);
    return true;
  }

  async stat(path: string): Promise<CloudFile | null> {
    if (!isSafePath(path)) throw new CloudError('UNSAFE_PATH', `path inseguro: ${path}`);
    const res = await this.request(path, { method: 'HEAD' });
    if (res.status === 404) return null;
    if (!res.ok) throw new CloudError('IO', `R2 stat ${res.status}`);
    const sizeBytes = Number(res.headers.get('content-length') ?? 0);
    const mime = res.headers.get('content-type') ?? 'application/octet-stream';
    return {
      path,
      name: path.split('/').pop() ?? path,
      type: classifyFile(path),
      sizeBytes,
      mime,
      updatedAt: res.headers.get('last-modified') ?? this.now(),
      url: this.publicUrl ? `${this.publicUrl}/${path}` : null,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Service                                                             */
/* ------------------------------------------------------------------ */

export interface CloudServiceOptions {
  adapter: CloudStorageAdapter;
  now?: () => string;
}

/** Orquesta un adapter: valida antes de escribir y agrega el manifest. */
export class CloudService {
  readonly adapter: CloudStorageAdapter;
  private readonly now: () => string;

  constructor(opts: CloudServiceOptions) {
    this.adapter = opts.adapter;
    this.now = opts.now ?? (() => new Date().toISOString());
  }

  /** Valida y sube. Devuelve los metadatos finales. */
  async upload(name: string, data: Uint8Array, targetPath?: string): Promise<CloudFile> {
    const validation = validateUpload(name, data.byteLength);
    if (!validation.ok) throw new CloudError('BAD_EXTENSION', validation.errors.join('; '));
    if (data.byteLength > MAX_UPLOAD_BYTES) throw new CloudError('TOO_LARGE', `supera ${humanSize(MAX_UPLOAD_BYTES)}`);
    const dir = targetPath ? targetPath.replace(/\/+$/, '') : 'drafts';
    const path = normalizeCloudPath(`${dir}/${validation.normalizedName}`);
    if (!path) throw new CloudError('INVALID_PATH', `path destino inválido: ${dir}`);
    const mime = MIME_BY_EXT[validation.ext] ?? 'application/octet-stream';
    await this.adapter.write(path, data, mime);
    return (await this.adapter.stat(path)) ?? { path, name: validation.normalizedName, type: validation.type, sizeBytes: data.byteLength, mime, updatedAt: this.now() };
  }

  async list(base?: string): Promise<CloudFile[]> {
    return this.adapter.list(base);
  }

  async manifest(base?: string): Promise<CloudManifest> {
    return buildCloudManifest(await this.adapter.list(base), this.now);
  }

  async remove(path: string): Promise<boolean> {
    if (!isSafePath(path)) throw new CloudError('UNSAFE_PATH', `path inseguro: ${path}`);
    return this.adapter.remove(path);
  }

  async stat(path: string): Promise<CloudFile | null> {
    if (!isSafePath(path)) throw new CloudError('UNSAFE_PATH', `path inseguro: ${path}`);
    return this.adapter.stat(path);
  }
}

/* ------------------------------------------------------------------ */
/* Herramienta de agente (wiring diferido a llm.ts)                    */
/* ------------------------------------------------------------------ */

export const cloudPathSchema = z
  .string()
  .max(255)
  .refine((p) => isSafePath(p), 'path cloud inválido (minúsculas, sin espacios, sin ..)');

export const cloudFilesInputSchema = z.object({
  op: z.enum(['list', 'upload', 'read', 'remove', 'stat']),
  /** Prefijo de listado o path destino (upload/read/remove/stat). */
  path: cloudPathSchema.optional(),
  /** Nombre original del archivo (upload). */
  name: z.string().max(255).optional(),
  /** Contenido base64 (upload). */
  contentB64: z.string().optional(),
});

export const cloudFilesTool = {
  name: 'cloud_files',
  description:
    'UltraIA Cloud storage: list/upload/read/remove/stat files in the project cloud (.ultraia/cloud local, or R2 via Worker when configured). Uploads are validated (safe paths, allowed extensions, 100 MiB cap). Use to persist media, drafts, briefs, exports and backups across sessions.',
  inputSchema: cloudFilesInputSchema,
} as const;

/** Handler inyectable para el wiring en llm.ts (adapter resuelto en runtime). */
export function createCloudFilesHandler(adapter: CloudStorageAdapter) {
  const service = new CloudService({ adapter });
  return async (input: z.infer<typeof cloudFilesInputSchema>) => {
    switch (input.op) {
      case 'list':
        return { files: await service.list(input.path) };
      case 'upload': {
        if (!input.name || !input.contentB64) throw new CloudError('INVALID_PATH', 'upload requiere name + contentB64');
        const data = Uint8Array.from(Buffer.from(input.contentB64, 'base64'));
        return { file: await service.upload(input.name, data, input.path) };
      }
      case 'read': {
        if (!input.path) throw new CloudError('INVALID_PATH', 'read requiere path');
        const data = await service.adapter.read(input.path);
        if (!data) throw new CloudError('NOT_FOUND', `no existe: ${input.path}`);
        return { contentB64: Buffer.from(data).toString('base64'), stat: await service.stat(input.path) };
      }
      case 'remove': {
        if (!input.path) throw new CloudError('INVALID_PATH', 'remove requiere path');
        return { removed: await service.remove(input.path), path: input.path };
      }
      case 'stat': {
        if (!input.path) throw new CloudError('INVALID_PATH', 'stat requiere path');
        return { file: await service.stat(input.path) };
      }
    }
  };
}

export const cloudTools = { cloud_files: cloudFilesTool } as const;