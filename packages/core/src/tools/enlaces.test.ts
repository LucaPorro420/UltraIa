import { describe, expect, it } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyEnlaces, contentChecksum, downloadSource, extractUrl, hasProcessedMark, slugifyUrl } from './enlaces';

const FIXTURE = `# Lista de enlaces del proyecto
https://github.com/asgeirtj/system_prompts_leaks/blob/main/Anthropic/claude-fable-5.md


https://github.com/cathrynlavery/diagram-design


https://github.com/browser-use/video-use ##Verifica el enlace y adaptalo al proyecto ## PROCESADO 17/08/2026


https://github.com/acme/generative-engine

Anotación sin URL: solo texto

https://github.com/acme/fractal-art ## PROCESADO 18/08/2026
`;

describe('extractUrl / slugifyUrl / hasProcessedMark', () => {
  it('extrae la primera URL http(s) de una línea', () => {
    expect(extractUrl('https://github.com/acme/repo texto')).toBe('https://github.com/acme/repo');
    expect(extractUrl('## PROCESADO 17/08 https://x.com/a'))?.toBe('https://x.com/a');
    expect(extractUrl('sin url aquí')).toBeNull();
    expect(extractUrl('')).toBeNull();
  });

  it('slug idempotente por URL', () => {
    expect(slugifyUrl('https://github.com/acme/Repo-Name')).toBe('repo-name');
    expect(slugifyUrl('https://github.com/acme/Repo-Name')).toBe(slugifyUrl('https://github.com/acme/Repo-Name'));
    expect(slugifyUrl('https://www.example.com/')).toBe('example');
    expect(slugifyUrl('https://example.com/doc.md')).toBe('doc');
    expect(slugifyUrl('https://instagram.com/p/DcJDsghiJne/')).toBe('dcjdsghijne');
  });

  it('detecta la marca PROCESADO', () => {
    expect(hasProcessedMark('## PROCESADO 17/08/2026')).toBe(true);
    expect(hasProcessedMark('## procesado')).toBe(true);
    expect(hasProcessedMark('no marcado')).toBe(false);
  });
});

describe('classifyEnlaces', () => {
  it('clasifica pendientes, procesados y saltados', () => {
    const out = classifyEnlaces(FIXTURE, { checkDisk: false });
    // URLs: claude-fable-5, diagram-design, video-use, generative-engine, fractal-art = 5
    expect(out.entries).toHaveLength(5);
    expect(out.processed).toHaveLength(2); // video-use (marca) + fractal-art (marca)
    expect(out.pending).toHaveLength(3); // claude-fable-5, diagram-design, generative-engine
    expect(out.skipped.length).toBeGreaterThan(0); // líneas de texto
    expect(out.entries.find((e) => e.slug === 'video-use')?.processed).toBe(true);
    expect(out.entries.find((e) => e.slug === 'generative-engine')?.processed).toBe(false);
  });

  it('marca como procesado lo ya descargado en learning/sources', () => {
    const dir = mkdtempSync(join(tmpdir(), 'enlaces-test-'));
    try {
      writeFileSync(join(dir, 'ya-descargado.md'), '# fuente');
      const content = 'https://example.com/ya-descargado\nhttps://example.com/nuevo\n';
      const out = classifyEnlaces(content, { sourcesDir: dir });
      expect(out.entries.find((e) => e.slug === 'ya-descargado')?.processed).toBe(true);
      expect(out.entries.find((e) => e.slug === 'nuevo')?.processed).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('la marca vale para la línea siguiente (ventana de 3)', () => {
    const out = classifyEnlaces('https://example.com/window\n## PROCESADO 18/08/2026\n', { checkDisk: false });
    expect(out.entries[0].processed).toBe(true);
  });
});

describe('downloadSource', () => {
  it('descarga y escribe el archivo crudo; fail-soft ante error', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'enlaces-dl-'));
    try {
      const fetchImpl = async (url: string) =>
        url.includes('ok')
          ? ({ ok: true, text: async () => '# Contenido crudo\n\nCon cuerpo.' } as never)
          : ({ ok: false, text: async () => '' } as never);
      const ok = await downloadSource('https://example.com/ok', 'fuente-ok', dir, fetchImpl as never);
      expect(ok.ok).toBe(true);
      expect(ok.chars).toBeGreaterThan(20);
      expect(existsSync(join(dir, 'fuente-ok.md'))).toBe(true);
      expect(readFileSync(join(dir, 'fuente-ok.md'), 'utf8')).toContain('Contenido crudo');

      const fail = await downloadSource('https://example.com/bad', 'fuente-bad', dir, fetchImpl as never);
      expect(fail.ok).toBe(false);
      expect(fail.error).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rechaza contenido demasiado corto', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'enlaces-dl2-'));
    try {
      const fetchImpl = async () => ({ ok: true, text: async () => 'x' }) as never;
      const r = await downloadSource('https://example.com/short', 'short', dir, fetchImpl as never);
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/vacío|bloqueado/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('contentChecksum', () => {
  it('es estable y sensible', () => {
    expect(contentChecksum('abc')).toBe(contentChecksum('abc'));
    expect(contentChecksum('abc')).not.toBe(contentChecksum('abd'));
  });
});