// -----------------------------------------------------------------------------
// qdrant-memory.ts - capability `qdrant_memory`
// -----------------------------------------------------------------------------
// FASE 4 del plan del agente de autoaprendizaje (aprobado 20/08/2026):
// persistencia EXTERNA de la memoria verificada (learning/truth/*.json) en
// Qdrant (Docker, sacd_system/) - la infraestructura vectorial que el diseno
// SACD/NASA proponia y que semantic-memory.ts resolvia en memoria pura.
//
// Diseno (dominio puro determinista + cliente HTTP fail-soft, keyless):
// - `planMemorySync(corpus)` - puro: calcula exactamente que puntos hay que
//   crear/actualizar/borrar (diff por id determinista), respetando el esquema
//   de la coleccion `memoria_experiencial` (vector dim 4, Cosine).
// - `buildQdrantPoint(doc)` / `embedDense4(text)` - puro: vector denso dim 4
//   derivado del embedding esparcido (4 buckets por hash) - siempre el mismo
//   para el mismo texto (estable entre procesos, sin deps).
// - `createQdrantClient(baseUrl, fetchImpl?)` - cliente HTTP REST de Qdrant
//   (GET /collections, PUT /collections, PUT /collections/:c/points?wait=true,
//   POST /collections/:c/points/search, DELETE /collections/:c/points) con
//   timeout, fail-soft (errores -> {ok:false, razon}) y fetch inyectable
//   (los tests usan un fake; nunca toca red).
// - `searchExternalMemory(client, query, k)` - recuperacion top-k contra la
//   coleccion con score del backend.
//
// Regla del proyecto: API directa > wrapper; sin LLM en el camino critico;
// los tests NUNCA ejecutan red real (fetch inyectable).
// -----------------------------------------------------------------------------

import { embedText, tokenize, type TruthDoc } from './semantic-memory';

/** Esquema fijo de la coleccion externa (sacd_system/nucleo_nasa.py). */
export const QDRANT_COLLECTION = 'memoria_experiencial';
export const QDRANT_VECTOR_SIZE = 4;
export const QDRANT_DISTANCE = 'Cosine';
export const QDRANT_DEFAULT_URL = 'http://127.0.0.1:6333';

/** Payload de un punto: la verdad verificada con metadata de procedencia. */
export type MemoryPayload = {
  tipo: string;
  fuente: string;
  texto: string;
  respuesta: string;
};

/** Punto listo para Qdrant (id + vector + payload). */
export type QdrantPoint = {
  id: number;
  vector: number[];
  payload: MemoryPayload;
};

/** Resultado de una busqueda externa. */
export type ExternalMemoryHit = {
  id: number;
  score: number;
  payload: MemoryPayload;
};

/** Resultado de una operacion de red (fail-soft). `status` = HTTP status real (0 si la red fallo). */
export type QdrantResult<T = unknown> =
  | { ok: true; data: T; status?: number }
  | { ok: false; razon: string; status?: number };

/** Plan de sincronizacion: diff puro entre corpus local y estado remoto. */
export type MemorySyncPlan = {
  crear: QdrantPoint[];
  actualizar: QdrantPoint[];
  borrar: number[];
  sinCambio: number;
};

/** Cliente HTTP de Qdrant (fetch inyectable para tests). */
export type QdrantClient = {
  baseUrl: string;
  /** GET /collections/:name -> existe la coleccion? */
  collectionExists(): Promise<QdrantResult<boolean>>;
  /** PUT /collections/:name (crea con esquema fijo; idempotente 400 si ya existe). */
  ensureCollection(): Promise<QdrantResult<{ created: boolean }>>;
  /** PUT /collections/:name/points?wait=true (upsert por id). */
  upsertPoints(points: QdrantPoint[]): Promise<QdrantResult<{ upserted: number }>>;
  /** POST /collections/:name/points/search (top-k por vector). */
  search(vector: number[], k: number): Promise<QdrantResult<ExternalMemoryHit[]>>;
  /** DELETE /collections/:name/points (por ids). */
  deletePoints(ids: number[]): Promise<QdrantResult<{ deleted: number }>>;
};

/** Denso dim 4: agrupa los hashes del embedding esparcido en 4 buckets (norm). */
export function embedDense4(text: string): number[] {
  const bag = embedText(text);
  const buckets = [0, 0, 0, 0];
  for (const [h, w] of bag) {
    buckets[h % 4] += w;
  }
  const norm = Math.sqrt(buckets.reduce((s, x) => s + x * x, 0)) || 1;
  return buckets.map((x) => Math.round((x / norm) * 1000) / 1000);
}

/** Id numerico estable del punto: djb2 del id del doc, acotado a entero seguro. */
export function pointIdFor(docId: string): number {
  let h = 5381;
  for (let i = 0; i < docId.length; i++) {
    h = ((h << 5) + h + docId.charCodeAt(i)) >>> 0;
  }
  return h % 2147483647; // rango positivo de Qdrant (int64 acepta, mantenemos uint31)
}

/** Construye el punto Qdrant para un TruthDoc (puro, determinista). */
export function buildQdrantPoint(doc: TruthDoc): QdrantPoint {
  return {
    id: pointIdFor(doc.id),
    vector: embedDense4(`${doc.texto} ${doc.respuesta}`),
    payload: {
      tipo: doc.tipo,
      fuente: doc.fuente,
      texto: doc.texto,
      respuesta: doc.respuesta,
    },
  };
}

/**
 * Plan de sincronizacion (puro): diff corpus local vs ids remotos conocidos.
 * - ids remotos = ids de puntos ya existentes (puede venir de una coleccion
 *   consultada, de un checkpoint o vacio para "sin estado remoto").
 * - `borrar` = ids remotos que ya no existen en el corpus (leccion retirada).
 * - `actualizar` = puntos del corpus cuyo id ya existe (payload/vector nuevo).
 * - `crear` = puntos nuevos. Determinista: orden por id asc.
 */
export function planMemorySync(corpus: TruthDoc[], remoteIds: number[] = []): MemorySyncPlan {
  const puntos = corpus.map(buildQdrantPoint);
  puntos.sort((a, b) => a.id - b.id);
  const localIds = new Set(puntos.map((p) => p.id));
  const remote = new Set(remoteIds);
  const crear: QdrantPoint[] = [];
  const actualizar: QdrantPoint[] = [];
  for (const p of puntos) {
    if (remote.has(p.id)) actualizar.push(p);
    else crear.push(p);
  }
  const borrar = [...remote].filter((id) => !localIds.has(id)).sort((a, b) => a - b);
  return { crear, actualizar, borrar, sinCambio: actualizar.length };
}

/** Genera el cuerpo JSON de upsert (puro, para tests/inspeccion). */
export function buildUpsertBody(points: QdrantPoint[]): { points: Array<{ id: number; vector: number[]; payload: MemoryPayload }> } {
  return { points };
}

/** Genera el cuerpo JSON de busqueda (puro). */
export function buildSearchBody(vector: number[], k: number, collection: string): Record<string, unknown> {
  return { vector, limit: Math.max(1, k), with_payload: true, collection };
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/**
 * Crea el cliente Qdrant REST (fail-soft).
 * - fetchImpl: inyectable (tests) - firma como global fetch.
 * - timeoutMs: 5000 por defecto (AbortController).
 * - API directa sobre el REST de Qdrant; sin deps, sin LLM.
 */
export function createQdrantClient(
  baseUrl: string = QDRANT_DEFAULT_URL,
  fetchImpl: typeof fetch = globalThis.fetch,
  timeoutMs = 5000,
): QdrantClient {
  const url = baseUrl.replace(/\/+$/, '');

  async function request<T>(method: string, path: string, body?: unknown): Promise<QdrantResult<T>> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${url}${path}`, {
        method,
        headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      if (!res.ok && res.status !== 400 && res.status !== 404) {
        return { ok: false, razon: `HTTP ${res.status} en ${method} ${path}`, status: res.status };
      }
      const text = await res.text();
      const data = text ? (JSON.parse(text) as T) : ({} as T);
      return { ok: true, data, status: res.status };
    } catch (e) {
      return { ok: false, razon: e instanceof Error ? e.message : String(e), status: 0 };
    } finally {
      clearTimeout(t);
    }
  }

  return {
    baseUrl: url,

    async collectionExists() {
      const r = await request<{ result?: { status?: string } }>('GET', `/collections/${QDRANT_COLLECTION}`);
      if (!r.ok) return r.status === 404 ? { ok: true, data: false, status: 404 } : r;
      return { ok: true, data: Boolean(r.data.result?.status) };
    },

    async ensureCollection() {
      const exists = await this.collectionExists();
      if (!exists.ok) return exists;
      if (exists.data) return { ok: true, data: { created: false } };
      const r = await request<{ result?: boolean }>('PUT', `/collections/${QDRANT_COLLECTION}`, {
        vectors: { size: QDRANT_VECTOR_SIZE, distance: QDRANT_DISTANCE },
      });
      if (!r.ok) return { ok: false, razon: `No se pudo crear la coleccion: ${r.razon}` };
      return { ok: true, data: { created: true } };
    },

    async upsertPoints(points) {
      if (points.length === 0) return { ok: true, data: { upserted: 0 } };
      const r = await request<{ result?: { status?: string } }>(
        'PUT',
        `/collections/${QDRANT_COLLECTION}/points?wait=true`,
        buildUpsertBody(points),
      );
      if (!r.ok) return { ok: false, razon: `Upsert fallo: ${r.razon}` };
      return { ok: true, data: { upserted: points.length } };
    },

    async search(vector, k) {
      const r = await request<{ result?: Array<{ id: number; score: number; payload: MemoryPayload }> }>(
        'POST',
        `/collections/${QDRANT_COLLECTION}/points/search`,
        buildSearchBody(vector, k, QDRANT_COLLECTION),
      );
      if (!r.ok) return { ok: false, razon: `Busqueda fallo: ${r.razon}` };
      const hits = (r.data.result ?? []).map((h) => ({
        id: h.id,
        score: round3(h.score),
        payload: h.payload,
      }));
      hits.sort((a, b) => b.score - a.score || a.id - b.id);
      return { ok: true, data: hits.slice(0, k) };
    },

    async deletePoints(ids) {
      if (ids.length === 0) return { ok: true, data: { deleted: 0 } };
      const r = await request<{ result?: { status?: string } }>(
        'DELETE',
        `/collections/${QDRANT_COLLECTION}/points`,
        { points: ids },
      );
      if (!r.ok) return { ok: false, razon: `Borrado fallo: ${r.razon}` };
      return { ok: true, data: { deleted: ids.length } };
    },
  };
}

/**
 * Sincroniza el corpus local con Qdrant (orquestador fail-soft):
 * 1) asegura la coleccion, 2) upsert crear+actualizar, 3) borra los retirados.
 * Devuelve un resumen accionable (nunca lanza).
 */
export async function syncMemoryToQdrant(
  client: QdrantClient,
  corpus: TruthDoc[],
  remoteIds: number[] = [],
): Promise<QdrantResult<{ plan: MemorySyncPlan; creados: number; actualizados: number; borrados: number }>> {
  const plan = planMemorySync(corpus, remoteIds);
  const ensure = await client.ensureCollection();
  if (!ensure.ok) return { ok: false, razon: ensure.razon };
  const up = await client.upsertPoints([...plan.crear, ...plan.actualizar]);
  if (!up.ok) return { ok: false, razon: up.razon };
  const del = await client.deletePoints(plan.borrar);
  if (!del.ok) return { ok: false, razon: del.razon };
  return {
    ok: true,
    data: {
      plan,
      creados: plan.crear.length,
      actualizados: plan.actualizar.length,
      borrados: plan.borrar.length,
    },
  };
}

/** Estadisticas de sincronizacion legibles (para reporte/CLI). */
export function memorySyncSummary(res: Awaited<ReturnType<typeof syncMemoryToQdrant>>): string {
  if (!res.ok) return `Qdrant NO disponible: ${res.razon}`;
  const { plan, creados, actualizados, borrados } = res.data;
  const total = plan.crear.length + plan.actualizar.length + plan.borrar.length + plan.sinCambio;
  return `Qdrant sincronizado: ${creados} creados, ${actualizados} actualizados, ${borrados} borrados (${total} total, ${plan.sinCambio} sin cambio)`;
}

export const qdrantMemory = {
  embedDense4,
  pointIdFor,
  buildQdrantPoint,
  planMemorySync,
  buildUpsertBody,
  buildSearchBody,
  createQdrantClient,
  syncMemoryToQdrant,
  memorySyncSummary,
  QDRANT_COLLECTION,
  QDRANT_VECTOR_SIZE,
  QDRANT_DISTANCE,
  QDRANT_DEFAULT_URL,
};

export type { TruthDoc } from './semantic-memory';
export { tokenize };