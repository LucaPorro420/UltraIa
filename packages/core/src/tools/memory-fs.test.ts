import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createMemoryFs,
  parseMemoryFile,
  serializeMemoryFile,
  normalizeMemoryPath,
  MemoryConflictError,
  MemoryAmbiguousError,
  MemoryNotFoundError,
  MemoryValidationError,
  type FsLike,
} from './memory-fs';

function tmpBase(): string {
  const dir = mkdtempSync(join(tmpdir(), 'memory-fs-'));
  return dir;
}

describe('parse/serialize (frontmatter + tags)', () => {
  it('parsea frontmatter con name/description/sources/aliases', () => {
    const text = [
      '---',
      'name: food',
      'description: gustos de comida',
      'sources: [chat]',
      'aliases: [comida, alimentacion]',
      '---',
      '- [stated] le gusta el te',
    ].join('\n') + '\n';
    const f = parseMemoryFile(text, 'topics/food');
    expect(f.name).toBe('food');
    expect(f.description).toBe('gustos de comida');
    expect(f.sources).toEqual(['chat']);
    expect(f.aliases).toEqual(['comida', 'alimentacion']);
    expect(f.lines).toEqual([{ tag: 'stated', text: 'le gusta el te' }]);
    expect(f.path).toBe('topics/food');
    expect(f.version).toBeTruthy();
  });

  it('parsea tags observed/inferred y linea sin tag como stated', () => {
    const text = [
      '---',
      'name: x',
      'description: d',
      'sources: [chat]',
      'aliases: []',
      '---',
      '- [stated] dicho',
      '- [observed] observado',
      '- [inferred] inferido',
      '- sin tag',
    ].join('\n') + '\n';
    const f = parseMemoryFile(text, 'x');
    expect(f.lines).toEqual([
      { tag: 'stated', text: 'dicho' },
      { tag: 'observed', text: 'observado' },
      { tag: 'inferred', text: 'inferido' },
      { tag: 'stated', text: 'sin tag' },
    ]);
  });

  it('roundtrip serialize → parse preserva contenido', () => {
    const meta = { path: 'people/sam', name: 'sam', description: 'colega', sources: ['chat'], aliases: [] };
    const lines = [{ tag: 'stated' as const, text: 'trabaja en infra' }];
    const text = serializeMemoryFile(meta, lines);
    const f = parseMemoryFile(text, 'people/sam');
    expect(f.name).toBe('sam');
    expect(f.lines).toEqual(lines);
  });

  it('rechaza frontmatter sin name/description y tags invalidos', () => {
    expect(() => parseMemoryFile('---\nsources: [chat]\n---\n', 'x')).toThrow(MemoryValidationError);
    expect(() => parseMemoryFile('---\nname: a\n---\n- [fake] x\n', 'x')).toThrow(MemoryValidationError);
    expect(() => parseMemoryFile('sin frontmatter', 'x')).toThrow(MemoryValidationError);
  });
});

describe('normalizeMemoryPath', () => {
  it('normaliza mayusculas, .md y espacios', () => {
    expect(normalizeMemoryPath(' topics/Food.md ')).toBe('topics/food');
    expect(normalizeMemoryPath('preferences')).toBe('preferences');
  });

  it('rechaza paths inseguros', () => {
    expect(() => normalizeMemoryPath('../etc')).toThrow(MemoryValidationError);
    expect(() => normalizeMemoryPath('/absoluto')).toThrow(MemoryValidationError);
    expect(() => normalizeMemoryPath('a\\b')).toThrow(MemoryValidationError);
    expect(() => normalizeMemoryPath('a b')).toThrow(MemoryValidationError);
    expect(() => normalizeMemoryPath('a/b/c/d')).toThrow(MemoryValidationError);
    expect(() => normalizeMemoryPath('')).toThrow(MemoryValidationError);
  });
});

describe('write/read + version guards', () => {
  it('write → read roundtrip con version estable', async () => {
    const mfs = createMemoryFs({});
    const input = { name: 'food', description: 'gustos', lines: ['[stated] le gusta el te'] };
    const r1 = await mfs.write('topics/food', input);
    const file = await mfs.read('topics/food');
    expect(file.name).toBe('food');
    expect(file.lines).toEqual([{ tag: 'stated', text: 'le gusta el te' }]);
    expect(file.version).toBe(r1.version);
    // idempotencia: escribir el mismo contenido → misma version
    const r2 = await mfs.write('topics/food', input, r1.version);
    expect(r2.version).toBe(r1.version);
  });

  it('write con ifVersion stale → MemoryConflictError', async () => {
    const mfs = createMemoryFs({});
    await mfs.write('topics/food', { description: 'v1', lines: ['a'] });
    await mfs.write('topics/food', { description: 'v2', lines: ['b'] });
    await expect(mfs.write('topics/food', { description: 'v3', lines: ['c'] }, 'version-vieja')).rejects.toThrow(MemoryConflictError);
  });

  it('write con ifVersion correcto → OK', async () => {
    const mfs = createMemoryFs({});
    const r1 = await mfs.write('topics/food', { description: 'v1', lines: ['a'] });
    const r2 = await mfs.write('topics/food', { description: 'v2', lines: ['b'] }, r1.version);
    expect(r2.version).not.toBe(r1.version);
  });

  it('read de path inexistente → MemoryNotFoundError', async () => {
    const mfs = createMemoryFs({});
    await expect(mfs.read('topics/nada')).rejects.toThrow(MemoryNotFoundError);
  });

  it('write con name invalido o lineas invalidas → MemoryValidationError', async () => {
    const mfs = createMemoryFs({});
    await expect(mfs.write('x', { name: 'Nombre Malo', description: 'd', lines: ['a'] })).rejects.toThrow(MemoryValidationError);
    await expect(mfs.write('x', { description: 'd', lines: ['a'.repeat(2001)] })).rejects.toThrow(MemoryValidationError);
    await expect(mfs.write('x', { description: 'd', lines: Array.from({ length: 501 }, () => 'a') })).rejects.toThrow(MemoryValidationError);
  });
});

describe('append', () => {
  it('agrega linea [stated] y cambia version', async () => {
    const mfs = createMemoryFs({});
    const r1 = await mfs.write('topics/food', { description: 'gustos', lines: ['a'] });
    const r2 = await mfs.append('topics/food', '[stated] ahora prefiere el cafe', r1.version);
    const file = await mfs.read('topics/food');
    expect(file.lines).toHaveLength(2);
    expect(file.lines[1]).toEqual({ tag: 'stated', text: 'ahora prefiere el cafe' });
    expect(r2.version).not.toBe(r1.version);
  });

  it('append con ifVersion stale → MemoryConflictError', async () => {
    const mfs = createMemoryFs({});
    await mfs.write('topics/food', { description: 'gustos', lines: ['a'] });
    await mfs.append('topics/food', 'b');
    await expect(mfs.append('topics/food', 'c', 'version-vieja')).rejects.toThrow(MemoryConflictError);
  });

  it('append sobre ficha inexistente la crea (patron primer hecho durable)', async () => {
    const mfs = createMemoryFs({});
    const r = await mfs.append('topics/te', 'le gusta el te');
    const file = await mfs.read('topics/te');
    expect(file.name).toBe('te');
    expect(file.lines).toEqual([{ tag: 'stated', text: 'le gusta el te' }]);
    expect(r.version).toBe(file.version);
  });
});

describe('strReplace', () => {
  it('reemplaza con match unico', async () => {
    const mfs = createMemoryFs({});
    const r1 = await mfs.write('topics/food', { description: 'gustos', lines: ['[stated] le gusta el te', '[stated] no le gusta el cafe'] });
    const r2 = await mfs.strReplace('topics/food', '- [stated] no le gusta el cafe', '', r1.version);
    const file = await mfs.read('topics/food');
    expect(file.lines).toHaveLength(1);
    expect(r2.version).not.toBe(r1.version);
  });

  it('0 matches → MemoryAmbiguousError', async () => {
    const mfs = createMemoryFs({});
    await mfs.write('topics/food', { description: 'gustos', lines: ['a'] });
    await expect(mfs.strReplace('topics/food', 'no existe', 'x')).rejects.toThrow(MemoryAmbiguousError);
  });

  it('2 matches → MemoryAmbiguousError (ampliar oldStr)', async () => {
    const mfs = createMemoryFs({});
    await mfs.write('topics/food', { description: 'gustos', lines: ['repite', 'repite'] });
    await expect(mfs.strReplace('topics/food', 'repite', 'x')).rejects.toThrow(MemoryAmbiguousError);
  });

  it('strReplace con ifVersion stale → MemoryConflictError', async () => {
    const mfs = createMemoryFs({});
    await mfs.write('topics/food', { description: 'gustos', lines: ['a'] });
    await mfs.append('topics/food', 'b');
    await expect(mfs.strReplace('topics/food', 'a', 'c', 'version-vieja')).rejects.toThrow(MemoryConflictError);
  });

  it('strReplace de ficha inexistente → MemoryNotFoundError', async () => {
    const mfs = createMemoryFs({});
    await expect(mfs.strReplace('topics/nada', 'a', 'b')).rejects.toThrow(MemoryNotFoundError);
  });
});

describe('delete', () => {
  it('elimina la ficha (y read falla despues)', async () => {
    const mfs = createMemoryFs({});
    const r = await mfs.write('topics/food', { description: 'gustos', lines: ['a'] });
    const res = await mfs.delete('topics/food', r.version);
    expect(res.deleted).toBe(true);
    await expect(mfs.read('topics/food')).rejects.toThrow(MemoryNotFoundError);
  });

  it('delete con ifVersion stale → MemoryConflictError', async () => {
    const mfs = createMemoryFs({});
    await mfs.write('topics/food', { description: 'gustos', lines: ['a'] });
    await mfs.append('topics/food', 'b');
    await expect(mfs.delete('topics/food', 'version-vieja')).rejects.toThrow(MemoryConflictError);
  });

  it('delete de ficha inexistente → MemoryNotFoundError', async () => {
    const mfs = createMemoryFs({});
    await expect(mfs.delete('topics/nada')).rejects.toThrow(MemoryNotFoundError);
  });
});

describe('list + dominios', () => {
  it('lista ordenada con description/aliases', async () => {
    const mfs = createMemoryFs({});
    await mfs.write('people/sam', { description: 'colega', aliases: ['samuel'], lines: ['[stated] trabaja en infra'] });
    await mfs.write('topics/food', { description: 'gustos de comida', lines: ['[stated] le gusta el te'] });
    const listing = await mfs.list();
    expect(listing.map((e) => e.path)).toEqual(['people/sam', 'topics/food']);
    expect(listing[0].aliases).toEqual(['samuel']);
    expect(listing[1].description).toBe('gustos de comida');
  });
});

describe('persistencia a disco', () => {
  it('sobrevive entre instancias con el mismo baseDir', async () => {
    const base = tmpBase();
    try {
      const mfs1 = createMemoryFs({ baseDir: base });
      const r = await mfs1.write('topics/food', { description: 'gustos', lines: ['[stated] le gusta el te'] });
      const mfs2 = createMemoryFs({ baseDir: base });
      const file = await mfs2.read('topics/food');
      expect(file.lines).toEqual([{ tag: 'stated', text: 'le gusta el te' }]);
      expect(file.version).toBe(r.version);
      // el archivo en disco es legible y es .md
      const raw = readFileSync(join(base, 'topics', 'food.md'), 'utf8');
      expect(raw).toContain('name: food');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('list() reconcilia archivos en disco escritos por otra superficie', async () => {
    const base = tmpBase();
    try {
      const mfs1 = createMemoryFs({ baseDir: base });
      await mfs1.write('topics/food', { description: 'gustos', lines: ['a'] });
      const mfs2 = createMemoryFs({ baseDir: base });
      const listing = await mfs2.list();
      expect(listing.some((e) => e.path === 'topics/food')).toBe(true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('escribe atómico: tmp + rename (stub fs)', async () => {
    const calls: string[] = [];
    const stub: FsLike = {
      readFile: async () => null,
      writeFile: async (p) => { calls.push(`write:${p}`); },
      rename: async (a, b) => { calls.push(`rename:${a}->${b}`); },
    };
    const mfs = createMemoryFs({ fs: stub, baseDir: 'C:\\tmp\\mem' });
    await mfs.write('topics/food', { description: 'gustos', lines: ['a'] });
    expect(calls.some((c) => c.startsWith('write:') && c.endsWith('.tmp'))).toBe(true);
    expect(calls.some((c) => c.startsWith('rename:') && c.includes('.tmp'))).toBe(true);
  });

  it('delete elimina el archivo en disco', async () => {
    const base = tmpBase();
    try {
      const mfs = createMemoryFs({ baseDir: base });
      const r = await mfs.write('topics/food', { description: 'gustos', lines: ['a'] });
      await mfs.delete('topics/food', r.version);
      expect(() => readFileSync(join(base, 'topics', 'food.md'), 'utf8')).toThrow();
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('versionOf', () => {
  it('devuelve la version actual o undefined', async () => {
    const mfs = createMemoryFs({});
    expect(await mfs.versionOf('topics/food')).toBeUndefined();
    const r = await mfs.write('topics/food', { description: 'gustos', lines: ['a'] });
    expect(await mfs.versionOf('topics/food')).toBe(r.version);
  });
});