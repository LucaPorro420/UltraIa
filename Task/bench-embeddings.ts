/**
 * bench-embeddings.ts — iter-79: harness de evaluacion SIN etiquetas manuales
 * (leave-one-out sobre learning/truth/*.json) de la recuperacion de memoria.
 *
 * Compara tres metodos sobre el corpus REAL (54 docs verificados):
 *   1) esparcido  — `searchTruth` (coseno del bag de hashes, referencia exacta)
 *   2) denso dim4 — `embedDense4` (LEGACY v1, no discrimina)
 *   3) denso      — `embedDense` (signed feature hashing, v2, lo que guarda Qdrant)
 *
 * Por cada doc se derivan 3 queries (gold = el propio doc):
 *   - texto    : query = doc.texto
 *   - respuesta: query = doc.respuesta
 *   - mutada   : query = dropout 50% determinista (seed 42) de doc.texto
 *
 * Metricas: recall@1, recall@5, MRR por modo, y coseno medio entre pares
 * distintos del corpus (criterio de discriminacion: debe ser <= 0.35).
 *
 * Uso:
 *   node_modules\.bin\vite-node.cmd Task/bench-embeddings.ts
 *
 * Sin red, sin LLM, determinista. Imprime la tabla + veredicto contra la
 * SPEC de aceptacion del plan loop-79.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { embedDense, embedDense4 } from '../packages/core/src/tools/qdrant-memory';
import { embedText, loadTruthCorpus, searchTruth, tokenize, type TruthDoc } from '../packages/core/src/tools/semantic-memory';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// ----------------------------------------------------------------- carga corpus
function loadCorpus(): TruthDoc[] {
  const dir = join(root, 'learning', 'truth');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const docs = files.map((f) => {
    const raw = readFileSync(join(dir, f), 'utf8');
    return { source: f.replace(/\.json$/, ''), ...JSON.parse(raw) };
  });
  return loadTruthCorpus(docs);
}

// -------------------------------------------------------------- util determinista
/** PRNG mulberry32 (seed fija -> salida reproducible entre procesos). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dropout determinista: conserva cada token con probabilidad `rate` (seed fija). */
function dropout(text: string, rate: number, seed: number): string {
  const tokens = tokenize(text);
  const rng = mulberry32(seed);
  return tokens.filter(() => rng() >= rate).join(' ');
}

/** Coseno entre dos vectores densos (arrays numericos). */
function cosineArr(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  for (const x of a) na += x * x;
  for (const x of b) nb += x * x;
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

// -------------------------------------------------------------- ranking de metodos
type RankFn = (query: string) => string[];

/** Ranking esparcido exacto (referencia). */
const rankEsparcido = (docs: TruthDoc[]): RankFn => (query: string) =>
  searchTruth(docs, query, docs.length).map((h) => h.id);

/** Ranking denso por fuerza bruta (embedDense / embedDense4 sobre texto+respuesta). */
function rankDenso(docs: TruthDoc[], embed: (t: string) => number[]): RankFn {
  const vecs = docs.map((d) => embed(`${d.texto} ${d.respuesta}`));
  return (query: string) => {
    const q = embed(query);
    return docs
      .map((d, i) => ({ id: d.id, s: cosineArr(q, vecs[i]) }))
      .sort((a, b) => b.s - a.s || (a.id < b.id ? -1 : 1))
      .map((x) => x.id);
  };
}

// ----------------------------------------------------------------------- metricas
interface Metrics {
  r1: number;
  r5: number;
  mrr: number;
}

function evaluate(rank: RankFn, queries: Array<{ gold: string; q: string }>): Metrics {
  let r1 = 0;
  let r5 = 0;
  let mrr = 0;
  for (const { gold, q } of queries) {
    const ranked = rank(q);
    const idx = ranked.indexOf(gold);
    if (idx < 0) continue;
    if (idx === 0) r1++;
    if (idx < 5) r5++;
    mrr += 1 / (idx + 1);
  }
  const n = queries.length;
  return { r1: r1 / n, r5: r5 / n, mrr: mrr / n };
}

function fmt(x: number): string {
  return (x * 100).toFixed(1) + '%';
}

// --------------------------------------------------------------------------- main
async function main() {
  const corpus = loadCorpus();
  console.log(`Corpus: ${corpus.length} docs verificados (learning/truth/*.json)\n`);

  // Construye las queries leave-one-out (gold = el propio doc).
  const queriesTexto = corpus.map((d) => ({ gold: d.id, q: d.texto }));
  const queriesRespuesta = corpus.map((d) => ({ gold: d.id, q: d.respuesta }));
  const queriesMutada = corpus.map((d) => ({ gold: d.id, q: dropout(d.texto, 0.5, 42) }));

  // Metodos.
  const esparcido = rankEsparcido(corpus);
  const denso4 = rankDenso(corpus, embedDense4);
  const denso = rankDenso(corpus, (t) => embedDense(t));

  const mEsp = {
    texto: evaluate(esparcido, queriesTexto),
    respuesta: evaluate(esparcido, queriesRespuesta),
    mutada: evaluate(esparcido, queriesMutada),
  };
  const m4 = {
    texto: evaluate(denso4, queriesTexto),
    respuesta: evaluate(denso4, queriesRespuesta),
    mutada: evaluate(denso4, queriesMutada),
  };
  const mD = {
    texto: evaluate(denso, queriesTexto),
    respuesta: evaluate(denso, queriesRespuesta),
    mutada: evaluate(denso, queriesMutada),
  };

  // Coseno medio entre pares distintos (criterio de discriminacion).
  const vecs4 = corpus.map((d) => embedDense4(`${d.texto} ${d.respuesta}`));
  const vecsD = corpus.map((d) => embedDense(`${d.texto} ${d.respuesta}`));
  let sum4 = 0;
  let sumD = 0;
  let pairs = 0;
  for (let i = 0; i < corpus.length; i++) {
    for (let j = i + 1; j < corpus.length; j++) {
      sum4 += cosineArr(vecs4[i], vecs4[j]);
      sumD += cosineArr(vecsD[i], vecsD[j]);
      pairs++;
    }
  }
  const cos4 = sum4 / pairs;
  const cosD = sumD / pairs;

  // ------------------------------------------------------------------ impresion
  const head = (label: string) => `\n=== ${label} ===`;
  const row = (name: string, m: Metrics) =>
    `  ${name.padEnd(10)} r@1=${fmt(m.r1).padStart(7)}  r@5=${fmt(m.r5).padStart(7)}  MRR=${fmt(m.mrr).padStart(7)}`;

  console.log(head('ESPARCIDO (referencia)'));
  console.log(row('texto', mEsp.texto));
  console.log(row('respuesta', mEsp.respuesta));
  console.log(row('mutada', mEsp.mutada));

  console.log(head('DENSO dim-4 (LEGACY v1, NO discrimina)'));
  console.log(row('texto', m4.texto));
  console.log(row('respuesta', m4.respuesta));
  console.log(row('mutada', m4.mutada));

  console.log(head('DENSO (v2, signed feature hashing)'));
  console.log(row('texto', mD.texto));
  console.log(row('respuesta', mD.respuesta));
  console.log(row('mutada', mD.mutada));

  console.log('\n=== Coseno medio entre pares distintos (debe ser BAJO) ===');
  console.log(`  dim-4 : ${cos4.toFixed(4)}`);
  console.log(`  v2    : ${cosD.toFixed(4)}`);

  // ------------------------------------------------------------------ veredicto
  const crit = { texto: 0.95, respuesta: 0.8, mutada: 0.91 };
  const cosMax = 0.35;
  const passTexto = mD.texto.r1 >= crit.texto;
  const passResp = mD.respuesta.r1 >= crit.respuesta;
  const passMut = mD.mutada.r1 >= crit.mutada;
  const passCos = cosD <= cosMax;
  const allPass = passTexto && passResp && passMut && passCos;

  console.log('\n=== Veredicto SPEC (loop-79) ===');
  console.log(`  r@1 texto    >= ${fmt(crit.texto)} : ${passTexto ? 'PASS' : 'FAIL'} (${fmt(mD.texto.r1)})`);
  console.log(`  r@1 respuesta>= ${fmt(crit.respuesta)} : ${passResp ? 'PASS' : 'FAIL'} (${fmt(mD.respuesta.r1)})`);
  console.log(`  r@1 mutada   >= ${fmt(crit.mutada)} : ${passMut ? 'PASS' : 'FAIL'} (${fmt(mD.mutada.r1)})`);
  console.log(`  coseno medio <= ${cosMax}       : ${passCos ? 'PASS' : 'FAIL'} (${cosD.toFixed(4)})`);
  console.log(`\n  RESULTADO: ${allPass ? 'ACEPTADO ✅' : 'RECHAZADO ❌'}`);

  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
