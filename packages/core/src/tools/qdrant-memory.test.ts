// -----------------------------------------------------------------------------
// qdrant-memory.test.ts - FASE 4: persistencia externa Qdrant (memoria
// verificada). Tests puros/deterministas con fetch FAKE (nunca tocan red).
// -----------------------------------------------------------------------------
import { describe, expect, it } from 'vitest';

import {
  QDRANT_COLLECTION,
  QDRANT_DEFAULT_URL,
  QDRANT_DISTANCE,
  QDRANT_VECTOR_SIZE,
  buildQdrantPoint,
  buildSearchBody,
  buildUpsertBody,
  createQdrantClient,
  embedDense,
  embedDense4,
  memorySyncSummary,
  planMemorySync,
  pointIdFor,
  syncMemoryToQdrant,
} from './qdrant-memory';
import { loadTruthCorpus, type TruthDoc } from './semantic-memory';

/** Fetch fake: responde segun la cola de respuestas (fail-soft incluido). */
function fakeFetch(responses: Array<{ status: number; body?: unknown }>) {
  const calls: Array<{ url: string; method?: string; body?: string; headers?: unknown }> = [];
  const impl = async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method, body: init?.body ? String(init.body) : undefined, headers: init?.headers });
    const r = responses.shift() ?? { status: 500 };
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      text: async () => (r.body === undefined ? '' : JSON.stringify(r.body)),
    } as Response;
  };
  return { impl, calls };
}

const corpus: TruthDoc[] = loadTruthCorpus([
  {
    source: 'truth_demo',
    cases: [
      { id: 1, prompt: 'Cuanto es 2+2?', answer: '4', type: 'exact' },
      { id: 2, prompt: 'Capital de Francia', answer: 'Paris', type: 'exact' },
    ],
  },
]);

describe('embedDense4 (vector dim 4, determinista)', () => {
  it('devuelve 4 componentes normalizados', () => {
    const v = embedDense4('area circulo formula pi radio');
    expect(v).toHaveLength(4);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('es estable entre llamadas (mismo texto -> mismo vector)', () => {
    expect(embedDense4('leccion verificada')).toEqual(embedDense4('leccion verificada'));
  });

  it('textos distintos tienden a diferir', () => {
    const a = embedDense4('como calcular el area de un circulo');
    const b = embedDense4('capital de francia y su historia');
    expect(a).not.toEqual(b);
  });

  it('texto vacio produce vector cero (no NaN)', () => {
    const v = embedDense4('');
    expect(v.every((x) => Number.isFinite(x))).toBe(true);
    expect(v).toHaveLength(4);
  });
});

describe('embedDense (signed feature hashing, iter-79: reemplaza a embedDense4 en la coleccion v2)', () => {
  it('devuelve QDRANT_VECTOR_SIZE componentes con norma 1', () => {
    const v = embedDense('area circulo formula pi radio');
    expect(v).toHaveLength(QDRANT_VECTOR_SIZE);
    expect(Math.sqrt(v.reduce((s, x) => s + x * x, 0))).toBeCloseTo(1, 2);
  });

  it('acepta dimension explicita y es determinista entre llamadas', () => {
    expect(embedDense('leccion verificada', 64)).toHaveLength(64);
    expect(embedDense('leccion verificada')).toEqual(embedDense('leccion verificada'));
  });

  it('usa signo: hay componentes negativas (las colisiones se cancelan)', () => {
    const v = embedDense('memoria semantica verificada con qdrant y vectores densos normalizados');
    expect(v.some((x) => x < 0)).toBe(true);
    expect(v.some((x) => x > 0)).toBe(true);
  });

  it('DISCRIMINA: textos no relacionados dan coseno bajo (dim 4 daba ~0.9)', () => {
    const cos = (a: number[], b: number[]) => {
      let d = 0;
      for (let i = 0; i < a.length; i++) d += a[i] * b[i];
      return d;
    };
    const a = embedDense('como calcular el area de un circulo con radio y pi');
    const b = embedDense('narracion con voces neuronales en catorce idiomas y musica de fondo');
    expect(Math.abs(cos(a, b))).toBeLessThan(0.35);
    expect(Math.abs(cos(embedDense4('como calcular el area de un circulo con radio y pi'), embedDense4('narracion con voces neuronales en catorce idiomas')))).toBeGreaterThan(0.35);
  });

  it('preserva el ranking del coseno esparcido en el caso canonico', () => {
    const cos = (a: number[], b: number[]) => {
      let d = 0;
      for (let i = 0; i < a.length; i++) d += a[i] * b[i];
      return d;
    };
    const q = embedDense('area del circulo');
    const relevante = embedDense('Calcula el area de un circulo de radio 7 (pi=3.14159) 153.94');
    const irrelevante = embedDense('Convierte 100 grados Celsius a Fahrenheit 212');
    expect(cos(q, relevante)).toBeGreaterThan(cos(q, irrelevante));
  });

  it('texto vacio produce vector finito de la dimension pedida (no NaN)', () => {
    const v = embedDense('');
    expect(v).toHaveLength(QDRANT_VECTOR_SIZE);
    expect(v.every((x) => Number.isFinite(x))).toBe(true);
  });
});

describe('pointIdFor + buildQdrantPoint (ids estables)', () => {
  it('id es un entero positivo estable', () => {
    const a = pointIdFor('truth_demo_1');
    expect(Number.isInteger(a)).toBe(true);
    expect(a).toBeGreaterThan(0);
    expect(a).toBe(pointIdFor('truth_demo_1'));
  });

  it('ids distintos para docs distintos', () => {
    expect(pointIdFor('truth_demo_1')).not.toBe(pointIdFor('truth_demo_2'));
  });

  it('buildQdrantPoint respeta el esquema (id, vector 4, payload con metadata)', () => {
    const p = buildQdrantPoint(corpus[0]);
    expect(p.id).toBe(pointIdFor(corpus[0].id));
    expect(p.vector).toHaveLength(QDRANT_VECTOR_SIZE);
    expect(p.payload).toEqual({
      tipo: 'exact',
      fuente: 'truth_demo',
      texto: corpus[0].texto,
      respuesta: '4',
    });
  });
});

describe('planMemorySync (diff puro determinista)', () => {
  it('sin ids remotos: todo es crear', () => {
    const plan = planMemorySync(corpus);
    expect(plan.crear.map((p) => p.id)).toEqual([pointIdFor(corpus[0].id), pointIdFor(corpus[1].id)]);
    expect(plan.actualizar).toEqual([]);
    expect(plan.borrar).toEqual([]);
    expect(plan.sinCambio).toBe(0);
  });

  it('ids remotos conocidos -> actualizar; ids retirados -> borrar', () => {
    const id1 = pointIdFor(corpus[0].id);
    const id2 = pointIdFor(corpus[1].id);
    // OJO: 'truth_demo_1' vs 'truth_demo_2' difieren en un solo char final ->
    // djb2 los hace CONSECUTIVOS (id2 = id1 + 1). El id retirado debe estar
    // fuera de ese rango para no colisionar con el corpus.
    const remotoRetirado = id1 + 1000;
    const plan = planMemorySync(corpus, [id1, remotoRetirado]);
    expect(plan.actualizar.map((p) => p.id)).toEqual([id1]);
    expect(plan.crear.map((p) => p.id)).toEqual([id2]);
    expect(plan.borrar).toEqual([remotoRetirado]);
    expect(plan.sinCambio).toBe(1);
  });

  it('orden determinista por id asc (empates no dependen del input)', () => {
    const rev = [...corpus].reverse();
    const planA = planMemorySync(corpus);
    const planB = planMemorySync(rev);
    expect(planA.crear.map((p) => p.id)).toEqual(planB.crear.map((p) => p.id));
  });

  it('cuerpos JSON: upsert y search (puros)', () => {
    const body = buildUpsertBody([buildQdrantPoint(corpus[0])]);
    expect(body.points[0]).toMatchObject({ id: pointIdFor(corpus[0].id) });
    expect(body.points[0].vector).toHaveLength(QDRANT_VECTOR_SIZE);
    const sb = buildSearchBody([0.5, 0.5, 0.5, 0.5], 3, QDRANT_COLLECTION);
    expect(sb).toMatchObject({ limit: 3, with_payload: true, collection: QDRANT_COLLECTION });
  });
});

describe('createQdrantClient (fetch fake, fail-soft)', () => {
  it('collectionExists: true cuando el backend responde con status', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { result: { status: 'green' } } }]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
    const res = await client.collectionExists();
    expect(res).toEqual({ ok: true, data: true });
    expect(calls[0].url).toContain(`/collections/${QDRANT_COLLECTION}`);
  });

  it('collectionExists: false ante 404', async () => {
    const { impl } = fakeFetch([{ status: 404 }]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
    const res = await client.collectionExists();
    expect(res).toEqual({ ok: true, data: false });
  });

  it('ensureCollection: crea con el esquema fijo cuando no existe', async () => {
    const { impl, calls } = fakeFetch([
      { status: 404 },
      { status: 200, body: { result: true } },
    ]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
    const res = await client.ensureCollection();
    expect(res).toEqual({ ok: true, data: { created: true } });
    const putCall = calls.find((c) => c.method === 'PUT');
    expect(putCall).toBeDefined();
    expect(putCall!.body).toContain(`"size":${QDRANT_VECTOR_SIZE}`);
    expect(putCall!.body).toContain(`"distance":"${QDRANT_DISTANCE}"`);
  });

  it('ensureCollection: no recrea si ya existe', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { result: { status: 'green' } } }]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
    const res = await client.ensureCollection();
    expect(res).toEqual({ ok: true, data: { created: false } });
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
  });

  it('upsertPoints: envia PUT /points?wait=true con el cuerpo', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { result: { status: 'completed' } } }]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
    const res = await client.upsertPoints([buildQdrantPoint(corpus[0])]);
    expect(res).toEqual({ ok: true, data: { upserted: 1 } });
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url).toContain('/points?wait=true');
  });

  it('upsertPoints: lista vacia no hace red', async () => {
    const { impl, calls } = fakeFetch([]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
    const res = await client.upsertPoints([]);
    expect(res).toEqual({ ok: true, data: { upserted: 0 } });
    expect(calls).toHaveLength(0);
  });

  it('search: mapea hits, ordena por score desc y recorta a k', async () => {
    const { impl } = fakeFetch([
      {
        status: 200,
        body: {
          result: [
            { id: 3, score: 0.5, payload: { tipo: 'exact', fuente: 'f', texto: 't', respuesta: 'r' } },
            { id: 1, score: 0.9, payload: { tipo: 'exact', fuente: 'f', texto: 't', respuesta: 'r' } },
            { id: 2, score: 0.7, payload: { tipo: 'exact', fuente: 'f', texto: 't', respuesta: 'r' } },
          ],
        },
      },
    ]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
    const res = await client.search([0.25, 0.25, 0.25, 0.25], 2);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.map((h) => h.id)).toEqual([1, 2]);
      expect(res.data[0].score).toBeCloseTo(0.9);
    }
  });

  it('error HTTP -> fail-soft con razon (nunca lanza)', async () => {
    const { impl } = fakeFetch([{ status: 503 }]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
    const res = await client.upsertPoints([buildQdrantPoint(corpus[0])]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.razon).toContain('HTTP 503');
  });

  it('fetch que lanza (red caida) -> fail-soft con razon', async () => {
    const impl = async () => {
      throw new Error('ECONNREFUSED');
    };
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
    const res = await client.collectionExists();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.razon).toContain('ECONNREFUSED');
  });

  it('deletePoints: DELETE con ids (fail-soft)', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { result: { status: 'completed' } } }]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
    const res = await client.deletePoints([11, 12]);
    expect(res).toEqual({ ok: true, data: { deleted: 2 } });
    expect(calls[0].method).toBe('DELETE');
  });
});

describe('syncMemoryToQdrant (orquestador fail-soft)', () => {
  it('flujo completo: asegura coleccion + upsert crear/actualizar + borra retirados', async () => {
    const id1 = pointIdFor(corpus[0].id);
    const id2 = pointIdFor(corpus[1].id);
    const { impl, calls } = fakeFetch([
      { status: 404 }, // collectionExists -> false
      { status: 200, body: { result: true } }, // PUT create
      { status: 200, body: { result: { status: 'completed' } } }, // upsert crear+actualizar
      { status: 200, body: { result: { status: 'completed' } } }, // delete retirado
    ]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
    const res = await syncMemoryToQdrant(client, corpus, [id1, id2 + 1]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.creados).toBe(1); // id2
      expect(res.data.actualizados).toBe(1); // id1
      expect(res.data.borrados).toBe(1); // id2+1 retirado
    }
    const methods = calls.map((c) => c.method);
    expect(methods).toContain('PUT');
    expect(methods).toContain('DELETE');
  });

  it('fallo al asegurar la coleccion -> fail-soft, no hace upsert', async () => {
    const { impl, calls } = fakeFetch([{ status: 503 }]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
    const res = await syncMemoryToQdrant(client, corpus);
    expect(res.ok).toBe(false);
    // Solo el GET de collectionExists; el fallo corta ANTES de cualquier PUT
    expect(calls).toHaveLength(1);
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    expect(calls[0].method).toBe('GET');
  });

  it('memorySyncSummary: resumen legible para reporte', () => {
    const res = {
      ok: true as const,
      data: { plan: { crear: [], actualizar: [], borrar: [], sinCambio: 2 }, creados: 0, actualizados: 0, borrados: 0 },
    };
    const s = memorySyncSummary(res);
    expect(s).toContain('Qdrant sincronizado');
    expect(s).toContain('0 creados');
    expect(s).toContain('2 sin cambio');
  });

  it('memorySyncSummary: degradacion elegante sin backend', () => {
    const res = { ok: false as const, razon: 'HTTP 503 en GET /collections/memoria_experiencial' };
    const s = memorySyncSummary(res);
    expect(s).toContain('Qdrant NO disponible');
    expect(s).toContain('503');
  });
});

describe('createQdrantClient / api-key (Qdrant Cloud, iter-90)', () => {
  it('apiKey explicito → cabecera api-key en cada request', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { result: { status: 'green' } } }]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch, 5000, 'secret-key');
    await client.collectionExists();
    expect((calls[0].headers as Record<string, string>)['api-key']).toBe('secret-key');
  });

  it('fallback a env QDRANT_API_KEY (restaurado tras el test)', async () => {
    const prev = process.env.QDRANT_API_KEY;
    process.env.QDRANT_API_KEY = 'env-key';
    try {
      const { impl, calls } = fakeFetch([{ status: 404 }]);
      const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch);
      await client.collectionExists();
      expect((calls[0].headers as Record<string, string>)['api-key']).toBe('env-key');
    } finally {
      if (prev === undefined) delete process.env.QDRANT_API_KEY;
      else process.env.QDRANT_API_KEY = prev;
    }
  });

  it('sin key → sin cabecera api-key (retrocompatible con local)', async () => {
    const { impl, calls } = fakeFetch([
      { status: 200, body: { result: true } },
      { status: 200, body: { result: { status: 'completed' } } },
    ]);
    const client = createQdrantClient(QDRANT_DEFAULT_URL, impl as unknown as typeof fetch, 5000, null);
    await client.upsertPoints([buildQdrantPoint(corpus[0])]);
    for (const c of calls) {
      const h = c.headers as Record<string, string> | undefined;
      expect(h?.['api-key']).toBeUndefined();
    }
    // el PUT sigue llevando content-type
    const put = calls.find((c) => c.method === 'PUT');
    expect((put!.headers as Record<string, string>)['content-type']).toBe('application/json');
  });
});