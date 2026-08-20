import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  STOPWORDS,
  cosineSimilarity,
  corpusStats,
  embedText,
  hashStr,
  loadTruthCorpus,
  loadTruthFromDir,
  searchTruth,
  SemanticMemoryIndex,
  tokenize,
} from './semantic-memory';

// Fixture de verdad (misma forma que learning/truth/truth_math.json)
const TRUTH_MATH = {
  source: 'truth_math',
  cases: [
    { id: 'math_1', prompt: 'Calcula: 17 * 23', answer: 391, type: 'exact', unit: '' },
    { id: 'math_2', prompt: 'Calcula: raiz cuadrada de 529', answer: 23, type: 'exact', unit: '' },
    { id: 'math_3', prompt: 'Calcula: (2^10) + (3^5) - 42', answer: 1225, type: 'exact', unit: '' },
    { id: 'math_4', prompt: 'Convierte 100 grados Celsius a Fahrenheit', answer: 212, type: 'exact', unit: 'F' },
    { id: 'math_5', prompt: 'Calcula el area de un circulo de radio 7 (pi=3.14159)', answer: 153.94, type: 'approx', tolerance: 0.5, unit: '' },
  ],
};

describe('hashStr', () => {
  it('es estable: mismo string -> mismo hash en llamadas repetidas', () => {
    const h1 = hashStr('area circulo');
    const h2 = hashStr('area circulo');
    expect(h1).toBe(h2);
  });

  it('es 32-bit sin signo y distingue strings distintos', () => {
    const h = hashStr('alpha');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(hashStr('alpha')).not.toBe(hashStr('omega'));
  });
});

describe('tokenize', () => {
  it('minusculas, separa por no-alfanumerico y quita stopwords', () => {
    expect(tokenize('El AREA de un circulo!')).toEqual(['area', 'circulo']);
  });

  it('soporta acentos espanoles y numeros', () => {
    expect(tokenize('Raiz cuadrada de 529')).toEqual(['raiz', 'cuadrada', '529']);
  });

  it('quita tokens de 1 char y stopwords es/en', () => {
    expect(tokenize('a b the de and para el')).toEqual([]);
    expect(STOPWORDS.has('que')).toBe(true);
    expect(STOPWORDS.has('the')).toBe(true);
  });
});

describe('embedText', () => {
  it('pesa tokens a 1 y bigramas a 0.5', () => {
    const bag = embedText('area circulo');
    expect(bag.get(hashStr('area'))).toBe(1);
    expect(bag.get(hashStr('circulo'))).toBe(1);
    expect(bag.get(hashStr('area circulo'))).toBe(0.5);
  });

  it('es determinista', () => {
    expect([...embedText('calcular area circulo radio').entries()]).toEqual([...embedText('calcular area circulo radio').entries()]);
  });
});

describe('cosineSimilarity', () => {
  it('identical -> 1', () => {
    const bag = embedText('area de un circulo');
    expect(cosineSimilarity(bag, bag)).toBeCloseTo(1, 5);
  });

  it('disjuntos -> 0', () => {
    expect(cosineSimilarity(embedText('area circulo'), embedText('temperatura fahrenheit'))).toBe(0);
  });

  it('bags vacios -> 0', () => {
    expect(cosineSimilarity(new Map(), new Map())).toBe(0);
    expect(cosineSimilarity(new Map(), embedText('hola'))).toBe(0);
  });

  it('parcial: comparten un token -> entre 0 y 1', () => {
    const s = cosineSimilarity(embedText('area circulo radio'), embedText('area rectangulo'));
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});

describe('loadTruthCorpus', () => {
  it('normaliza casos de verdad (answer numerico -> string, id con fuente)', () => {
    const docs = loadTruthCorpus([TRUTH_MATH]);
    expect(docs).toHaveLength(5);
    expect(docs[0]).toEqual({
      id: 'truth_math_math_1',
      texto: 'Calcula: 17 * 23',
      respuesta: '391',
      tipo: 'exact',
      fuente: 'truth_math',
    });
    expect(docs[4].respuesta).toBe('153.94');
  });

  it('es lenient: casos sin id/prompt/answer no rompen', () => {
    const docs = loadTruthCorpus([{ source: 's', cases: [{ id: 'x', prompt: 'p', answer: 1 }, { prompt: 'solo prompt' }, {}] }]);
    expect(docs).toHaveLength(3);
    expect(docs[1].id).toBe('s_case_1');
    expect(docs[2].respuesta).toBe('');
  });

  it('stringifica objetos en la respuesta', () => {
    const docs = loadTruthCorpus([{ source: 's', cases: [{ id: 'a', prompt: 'p', answer: { ok: true, valor: 2 } }] }]);
    expect(docs[0].respuesta).toBe('{"ok":true,"valor":2}');
  });
});

describe('searchTruth', () => {
  it('rankea por relevancia: query de area -> caso del circulo primero', () => {
    const docs = loadTruthCorpus([TRUTH_MATH]);
    const hits = searchTruth(docs, 'calcular el area de un circulo', 3);
    expect(hits[0].id).toBe('truth_math_math_5');
    expect(hits[0].score).toBeGreaterThan(0);
  });

  it('query de conversion termica -> caso Celsius primero', () => {
    const docs = loadTruthCorpus([TRUTH_MATH]);
    const hits = searchTruth(docs, 'conversion de grados celsius', 2);
    expect(hits[0].id).toBe('truth_math_math_4');
  });

  it('es determinista: misma query -> mismo orden', () => {
    const docs = loadTruthCorpus([TRUTH_MATH]);
    const a = searchTruth(docs, 'raiz cuadrada', 5).map((h) => h.id);
    const b = searchTruth(docs, 'raiz cuadrada', 5).map((h) => h.id);
    expect(a).toEqual(b);
  });

  it('query sin coincidencias -> scores 0 y slice respeta k', () => {
    const docs = loadTruthCorpus([TRUTH_MATH]);
    const hits = searchTruth(docs, 'zzzqqqxxx', 2);
    expect(hits).toHaveLength(2);
    expect(hits.every((h) => h.score === 0)).toBe(true);
  });

  it('mezcla texto+respuesta en la busqueda (busca por la respuesta)', () => {
    const docs = loadTruthCorpus([TRUTH_MATH]);
    const hits = searchTruth(docs, '153.94', 1);
    expect(hits[0].id).toBe('truth_math_math_5');
  });
});

describe('corpusStats', () => {
  it('cuenta total, fuentes unicas y tipos', () => {
    const stats = corpusStats(loadTruthCorpus([TRUTH_MATH, { source: 'truth_extra', cases: [{ id: 'e1', prompt: 'x', answer: 1, type: 'exact' }, { id: 'e2', prompt: 'y', answer: 2 }] }]));
    expect(stats.total).toBe(7);
    expect(stats.fuentes).toEqual(['truth_extra', 'truth_math']);
    expect(stats.tipos).toEqual({ exact: 5, approx: 1, sin_tipo: 1 });
  });
});

describe('SemanticMemoryIndex', () => {
  it('add/query/remove/size/ids', () => {
    const index = new SemanticMemoryIndex();
    const docs = loadTruthCorpus([TRUTH_MATH]);
    for (const d of docs) index.add(d);
    expect(index.size).toBe(5);
    expect(index.ids()).toHaveLength(5);

    const hits = index.query('area de un circulo', 1);
    expect(hits[0].id).toBe('truth_math_math_5');

    expect(index.remove('truth_math_math_5')).toBe(true);
    expect(index.remove('no_existe')).toBe(false);
    expect(index.size).toBe(4);
  });

  it('query sobre indice vacio -> []', () => {
    expect(new SemanticMemoryIndex().query('hola', 3)).toEqual([]);
  });
});

describe('loadTruthFromDir', () => {
  it('carga todos los truth JSON de un directorio (fail-soft con archivo corrupto)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'semantic-memory-test-'));
    try {
      writeFileSync(join(dir, 'truth_a.json'), JSON.stringify({ cases: [{ id: 'a1', prompt: 'pregunta a', answer: 42 }] }), 'utf8');
      writeFileSync(join(dir, 'truth_b.json'), JSON.stringify({ cases: [{ id: 'b1', prompt: 'pregunta b', answer: 'si' }] }), 'utf8');
      writeFileSync(join(dir, 'roto.json'), '{no es json', 'utf8');
      writeFileSync(join(dir, 'not-json.txt'), 'ignorado', 'utf8');

      const docs = await loadTruthFromDir(dir);
      expect(docs).toHaveLength(2);
      expect(docs.map((d) => d.id).sort()).toEqual(['truth_a_a1', 'truth_b_b1']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('directorio inexistente -> []', async () => {
    expect(await loadTruthFromDir(join(tmpdir(), 'no-existe-xyz'))).toEqual([]);
  });
});