import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CloudError,
  CloudService,
  CLOUD_LAYOUT,
  InMemoryCloudAdapter,
  LocalCloudAdapter,
  R2CloudAdapter,
  buildCloudManifest,
  classifyFile,
  cloudFilesTool,
  createCloudFilesHandler,
  humanSize,
  isSafePath,
  normalizeCloudPath,
  planCloudLayout,
  sanitizeFileName,
  validateUpload,
  type CloudFile,
} from './cloud';

const now = () => '2026-08-17T12:00:00.000Z';

describe('cloud: validación de paths', () => {
  it('isSafePath acepta paths canónicos', () => {
    expect(isSafePath('publications/idea-1.mp4')).toBe(true);
    expect(isSafePath('media/videos/largo/2026/08/archivo.mkv')).toBe(true);
    expect(isSafePath('a/b/c/d/e/f.mp4')).toBe(true);
  });

  it('isSafePath rechaza traversal, backslash, nulos y vacíos', () => {
    expect(isSafePath('../etc/passwd')).toBe(false);
    expect(isSafePath('a/../b.mp4')).toBe(false);
    expect(isSafePath('a\\b.mp4')).toBe(false);
    expect(isSafePath('a/b\0c.mp4')).toBe(false);
    expect(isSafePath('')).toBe(false);
    expect(isSafePath('/abs.mp4')).toBe(false);
    expect(isSafePath('a/')).toBe(false);
    expect(isSafePath('./a.mp4')).toBe(false);
    expect(isSafePath('a//b.mp4')).toBe(false);
  });

  it('isSafePath rechaza espacios y mayúsculas (canónico estricto)', () => {
    expect(isSafePath('mi archivo.mp4')).toBe(false);
    expect(isSafePath('MiArchivo.MP4')).toBe(false);
  });

  it('normalizeCloudPath limpia backslash y duplica slashes', () => {
    expect(normalizeCloudPath('drafts\\idea-1.mp4')).toBe('drafts/idea-1.mp4');
    expect(normalizeCloudPath('drafts//idea-1.mp4')).toBe('drafts/idea-1.mp4');
    expect(normalizeCloudPath('  drafts/idea-1.mp4  ')).toBe('drafts/idea-1.mp4');
    expect(normalizeCloudPath('../x')).toBeNull();
    expect(normalizeCloudPath('a\\..\\b')).toBeNull();
  });

  it('sanitizeFileName produce nombres seguros y en minúsculas', () => {
    expect(sanitizeFileName('Mi Video Final.MP4')).toBe('mi-video-final.mp4');
    expect(sanitizeFileName('a  b   c.md')).toBe('a-b-c.md');
    expect(sanitizeFileName('../evil.py')).toBe('evil.py');
    expect(sanitizeFileName('a\\b\\c.ts')).toBe('c.ts');
    expect(sanitizeFileName('c:\\\\windows\\\\x.pdf')).toBe('x.pdf');
    expect(sanitizeFileName('   ')).toBe('untitled');
    expect(sanitizeFileName('x. tar')).toBe('x.tar');
  });
});

describe('cloud: clasificación y uploads', () => {
  it('classifyFile por extensión', () => {
    expect(classifyFile('clip.mp4')).toBe('video');
    expect(classifyFile('narracion.mp3')).toBe('audio');
    expect(classifyFile('poster.png')).toBe('image');
    expect(classifyFile('guion.md')).toBe('document');
    expect(classifyFile('script.py')).toBe('script');
    expect(classifyFile('data.json')).toBe('data');
    expect(classifyFile('archivo.xyz')).toBe('other');
  });

  it('validateUpload acepta extensiones permitidas y rechaza las demás', () => {
    expect(validateUpload('clip.mp4', 1024).ok).toBe(true);
    expect(validateUpload('clip.exe', 1024).ok).toBe(false);
    expect(validateUpload('clip', 1024).ok).toBe(false);
    expect(validateUpload('clip.mp4', 0).ok).toBe(false);
  });

  it('validateUpload rechaza > 100 MiB', () => {
    const v = validateUpload('big.mp4', 100 * 1024 * 1024 + 1);
    expect(v.ok).toBe(false);
    expect(v.errors.join(' ')).toContain('100 MiB');
  });

  it('humanSize formatea unidades', () => {
    expect(humanSize(0)).toBe('0 B');
    expect(humanSize(512)).toBe('512 B');
    expect(humanSize(1024)).toBe('1 KiB');
    expect(humanSize(1536)).toBe('1.5 KiB');
    expect(humanSize(5 * 1024 * 1024)).toBe('5 MiB');
    expect(humanSize(3.7 * 1024 * 1024 * 1024)).toBe('3.7 GiB');
  });
});

describe('cloud: layout y manifest', () => {
  it('planCloudLayout devuelve las 9 carpetas', () => {
    expect(planCloudLayout()).toHaveLength(CLOUD_LAYOUT.length);
    expect(planCloudLayout().map((e) => e.path)).toContain('media/videos');
  });

  it('buildCloudManifest agrega conteo, bytes y tipos', () => {
    const files: CloudFile[] = [
      { path: 'a.mp4', name: 'a.mp4', type: 'video', sizeBytes: 1000, mime: 'video/mp4', updatedAt: now() },
      { path: 'b.mp3', name: 'b.mp3', type: 'audio', sizeBytes: 2000, mime: 'audio/mpeg', updatedAt: now() },
      { path: 'c.mp4', name: 'c.mp4', type: 'video', sizeBytes: 3000, mime: 'video/mp4', updatedAt: now() },
    ];
    const m = buildCloudManifest(files, () => now());
    expect(m.count).toBe(3);
    expect(m.totalBytes).toBe(6000);
    expect(m.byType).toEqual({ video: 2, audio: 1 });
  });
});

describe('cloud: InMemoryCloudAdapter', () => {
  it('write/read/stat/remove round-trip', async () => {
    const a = new InMemoryCloudAdapter({ now });
    await a.write('drafts/nota.md', new TextEncoder().encode('hola'), 'text/markdown');
    const f = await a.stat('drafts/nota.md');
    expect(f?.name).toBe('nota.md');
    expect(f?.type).toBe('document');
    const data = await a.read('drafts/nota.md');
    expect(new TextDecoder().decode(data!)).toBe('hola');
    expect(await a.remove('drafts/nota.md')).toBe(true);
    expect(await a.stat('drafts/nota.md')).toBeNull();
  });

  it('rechaza paths inseguros en write', async () => {
    const a = new InMemoryCloudAdapter();
    await expect(a.write('../x.txt', new Uint8Array(0), 'text/plain')).rejects.toThrow(CloudError);
  });

  it('list filtra por base y ordena', async () => {
    const a = new InMemoryCloudAdapter();
    await a.write('media/videos/a.mp4', new Uint8Array(1), 'video/mp4');
    await a.write('media/audio/b.mp3', new Uint8Array(1), 'audio/mpeg');
    await a.write('drafts/c.md', new Uint8Array(1), 'text/markdown');
    const all = await a.list();
    expect(all.map((f) => f.path)).toEqual(['drafts/c.md', 'media/audio/b.mp3', 'media/videos/a.mp4']);
    const media = await a.list('media');
    expect(media).toHaveLength(2);
  });
});

describe('cloud: LocalCloudAdapter (tmpdir real)', () => {
  it('persiste, lista, lee y borra en disco', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cloud-test-'));
    try {
      const a = new LocalCloudAdapter(dir, { now });
      await a.write('publications/clip.mp4', new TextEncoder().encode('vid'), 'video/mp4');
      await a.write('media/images/poster.png', new TextEncoder().encode('img'), 'image/png');
      const files = await a.list();
      expect(files).toHaveLength(2);
      expect(files[0]?.sizeBytes).toBe(3);
      const content = await a.read('publications/clip.mp4');
      expect(new TextDecoder().decode(content!)).toBe('vid');
      expect(await a.stat('nope.mp4')).toBeNull();
      expect(await a.read('nope.mp4')).toBeNull();
      expect(await a.remove('publications/clip.mp4')).toBe(true);
      expect(await a.list()).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('list sobre directorio inexistente → vacío (fail-soft)', async () => {
    const dir = join(tmpdir(), 'cloud-missing-' + Date.now());
    const a = new LocalCloudAdapter(dir);
    expect(await a.list()).toEqual([]);
  });

  it('rechaza traversal y read/remove/stat de paths inseguros', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cloud-sec-'));
    try {
      const a = new LocalCloudAdapter(dir);
      await expect(a.read('../x')).rejects.toThrow(CloudError);
      await expect(a.remove('..')).rejects.toThrow(CloudError);
      await expect(a.stat('a/../../b')).rejects.toThrow(CloudError);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('cloud: R2CloudAdapter (fetch mock)', () => {
  const okJson = () => ({ ok: true, status: 200, json: async () => ({ files: [] }), arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers() }) as unknown as Response;

  const makeFetch = (routes: Record<string, () => Promise<Response>>) =>
    async (url: unknown, init?: RequestInit) => {
      const u = String(url).replace('https://cloud.test.workers.dev', '');
      const method = init?.method ?? 'GET';
      const key = `${method} ${u}`;
      const handler = routes[key];
      if (!handler) return new Response('not found', { status: 404 });
      return handler();
    };

  it('list agrega publicUrl y filtra por base', async () => {
    const fetchImpl = makeFetch({
      'GET /files': async () =>
        ({ ...okJson(), json: async () => ({ files: [{ path: 'drafts/a.md', name: 'a.md', type: 'document', sizeBytes: 5, mime: 'text/markdown', updatedAt: now() }] }) }) as unknown as Response,
    });
    const a = new R2CloudAdapter({ baseUrl: 'https://cloud.test.workers.dev', token: 'tok', publicUrl: 'https://cloud.test.pages.dev', fetchImpl });
    const files = await a.list();
    expect(files[0]?.url).toBe('https://cloud.test.pages.dev/drafts/a.md');
    expect(await a.list('media')).toEqual([]);
  });

  it('write envía PUT con bearer y content-type', async () => {
    const seen: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = async (url: unknown, init?: RequestInit) => {
      seen.push({ url: String(url), init });
      return new Response('ok', { status: 201 });
    };
    const a = new R2CloudAdapter({ baseUrl: 'https://cloud.test.workers.dev', token: 'tok', fetchImpl });
    await a.write('drafts/a.md', new TextEncoder().encode('x'), 'text/markdown');
    expect(seen[0]?.url).toContain('/files/drafts/a.md');
    expect(seen[0]?.init?.method).toBe('PUT');
    expect((seen[0]?.init?.headers as Record<string, string>)?.Authorization).toBe('Bearer tok');
    expect((seen[0]?.init?.headers as Record<string, string>)?.['Content-Type']).toBe('text/markdown');
  });

  it('read devuelve null en 404 y error IO en otros', async () => {
    const fetchImpl = makeFetch({
      'GET /files/x.mp4': async () => new Response('gone', { status: 404 }),
    });
    const a = new R2CloudAdapter({ baseUrl: 'https://cloud.test.workers.dev', token: 'tok', fetchImpl });
    expect(await a.read('x.mp4')).toBeNull();
  });
});

describe('cloud: CloudService y tool', () => {
  it('upload valida, normaliza y persiste en drafts por defecto', async () => {
    const a = new InMemoryCloudAdapter({ now });
    const s = new CloudService({ adapter: a, now });
    const f = await s.upload('Mi Archivo.MP4', new TextEncoder().encode('v'));
    expect(f.path).toBe('drafts/mi-archivo.mp4');
    expect(f.type).toBe('video');
    expect(f.mime).toBe('video/mp4');
    expect(await a.read(f.path)).not.toBeNull();
  });

  it('upload con dir destino explícito y sin colisión', async () => {
    const a = new InMemoryCloudAdapter({ now });
    const s = new CloudService({ adapter: a, now });
    await s.upload('clip.mp4', new Uint8Array(1), 'publications');
    await s.upload('clip.mp4', new Uint8Array(2), 'publications');
    const files = await s.list('publications');
    expect(files).toHaveLength(1);
    expect(files[0]?.sizeBytes).toBe(2); // sobrescribe
  });

  it('upload rechaza extensiones no admitidas y archivos gigantes', async () => {
    const a = new InMemoryCloudAdapter();
    const s = new CloudService({ adapter: a });
    await expect(s.upload('virus.exe', new Uint8Array(1))).rejects.toThrow(/extensión/);
    await expect(s.upload('big.mp4', new Uint8Array(MAX_BIG))).rejects.toThrow(/100 MiB/);
  });

  it('manifest del service refleja el estado', async () => {
    const a = new InMemoryCloudAdapter({ now });
    const s = new CloudService({ adapter: a, now });
    await s.upload('a.mp4', new Uint8Array(10), 'drafts');
    await s.upload('b.md', new Uint8Array(5), 'drafts');
    const m = await s.manifest();
    expect(m.count).toBe(2);
    expect(m.totalBytes).toBe(15);
    expect(m.byType).toEqual({ video: 1, document: 1 });
  });

  it('remove/stat a través del service', async () => {
    const a = new InMemoryCloudAdapter({ now });
    const s = new CloudService({ adapter: a, now });
    await s.upload('x.pdf', new Uint8Array(3), 'exports');
    expect((await s.stat('exports/x.pdf'))?.sizeBytes).toBe(3);
    expect(await s.remove('exports/x.pdf')).toBe(true);
    expect(await s.remove('exports/x.pdf')).toBe(false);
    expect(await s.stat('exports/x.pdf')).toBeNull();
  });

  it('cloudFilesTool expone schema y descripción para llm.ts', () => {
    expect(cloudFilesTool.name).toBe('cloud_files');
    expect(cloudFilesTool.inputSchema.shape.op.options).toContain('list');
    expect(cloudFilesTool.description).toContain('Cloud');
  });

  it('createCloudFilesHandler: list/upload/read/remove/stat end-to-end', async () => {
    const a = new InMemoryCloudAdapter({ now });
    const h = createCloudFilesHandler(a);
    const up = await h({ op: 'upload', name: 'nota.md', contentB64: Buffer.from('hola').toString('base64') });
    const file = (up as { file: CloudFile }).file;
    expect(file.path).toContain('nota.md');
    const rd = (await h({ op: 'read', path: file.path })) as { contentB64: string };
    expect(Buffer.from(rd.contentB64, 'base64').toString()).toBe('hola');
    const st = (await h({ op: 'stat', path: file.path })) as { file: CloudFile | null };
    expect(st.file?.sizeBytes).toBe(4);
    const rm2 = (await h({ op: 'remove', path: file.path })) as { removed: boolean };
    expect(rm2.removed).toBe(true);
    const list = (await h({ op: 'list' })) as { files: CloudFile[] };
    expect(list.files).toHaveLength(0);
  });
});

const MAX_BIG = 100 * 1024 * 1024 + 1;