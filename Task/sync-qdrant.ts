/**
 * sync-qdrant.ts — FASE 4 del agente de autoaprendizaje (20/08/2026):
 * persistencia EXTERNA de la memoria verificada en Qdrant (Docker,
 * sacd_system/, coleccion `memoria_experiencial`, vector dim 4 Cosine).
 *
 * Lee learning/truth/*.json (corpus de verdad verificado), construye el plan
 * de sincronizacion (puro, determinista) y lo aplica contra el Qdrant real
 * via el cliente REST fail-soft de `qdrant-memory` (keyless, sin deps).
 *
 * Uso:
 *   node_modules\.bin\vite-node.cmd Task/sync-qdrant.ts            # sync real
 *   node_modules\.bin\vite-node.cmd Task/sync-qdrant.ts --dry-run  # solo plan
 *   node_modules\.bin\vite-node.cmd Task/sync-qdrant.ts --url http://127.0.0.1:6333
 *   node_modules\.bin\vite-node.cmd Task/sync-qdrant.ts --search "area circulo"
 *
 * Salida:
 *   .ultraia/qdrant/memory-sync.json   (plan + resultado, idempotente)
 *   .ultraia/qdrant/README.md          (indice del cloud de memoria)
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  QDRANT_DEFAULT_URL,
  createQdrantClient,
  embedDense4,
  memorySyncSummary,
  planMemorySync,
  syncMemoryToQdrant,
} from '../packages/core/src/tools/qdrant-memory';
import { loadTruthCorpus, type TruthDoc } from '../packages/core/src/tools/semantic-memory';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const write = (rel: string, content: string) => {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return rel;
};

/** Carga TODO learning/truth/*.json como corpus (lenient, idempotente). */
function loadCorpus(): TruthDoc[] {
  const dir = join(root, 'learning', 'truth');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const docs = files.map((f) => {
    const raw = readFileSync(join(dir, f), 'utf8');
    return { source: f.replace(/\.json$/, ''), ...JSON.parse(raw) };
  });
  return loadTruthCorpus(docs);
}

/** Construye el README del cloud de memoria (determinista). */
function buildReadme(corpus: TruthDoc[], plan: ReturnType<typeof planMemorySync>, res: string): string {
  const total = corpus.length;
  const fuentes = [...new Set(corpus.map((d) => d.fuente))].sort();
  const tipos: Record<string, number> = {};
  for (const d of corpus) tipos[d.tipo || 'sin_tipo'] = (tipos[d.tipo || 'sin_tipo'] ?? 0) + 1;
  return [
    '# Memoria verificada — cloud Qdrant (FASE 4)',
    '',
    `Sincronizado: ${new Date().toISOString().slice(0, 10)}`,
    '',
    `- Total de docs: ${total}`,
    `- Fuentes: ${fuentes.join(', ')}`,
    `- Tipos: ${Object.entries(tipos).map(([k, v]) => `${k} (${v})`).join(', ')}`,
    `- Plan: ${plan.crear.length} crear, ${plan.actualizar.length} actualizar, ${plan.borrar.length} borrar, ${plan.sinCambio} sin cambio`,
    `- Resultado: ${res}`,
    '',
    'Coleccion: `memoria_experiencial` (vector dim 4, Cosine) — esquema de sacd_system/nucleo_nasa.py.',
    'Regenerar: `node_modules\\.bin\\vite-node.cmd Task/sync-qdrant.ts`.',
    '',
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const urlFlag = args.find((a) => a.startsWith('--url='));
  const baseUrl = urlFlag ? urlFlag.split('=')[1] : QDRANT_DEFAULT_URL;
  const searchEq = args.find((a) => a.startsWith('--search='))?.split('=')[1];
  const searchIdx = args.indexOf('--search');
  const searchQuery = searchEq ?? (searchIdx >= 0 ? args[searchIdx + 1] : undefined);

  const corpus = loadCorpus();
  const client = createQdrantClient(baseUrl);

  if (searchQuery) {
    console.log(`Busqueda externa (k=5): "${searchQuery}"`);
    const res = await client.search(embedDense4(searchQuery), 5);
    if (!res.ok) {
      console.log(`  Qdrant NO disponible: ${res.razon}`);
      process.exit(1);
    }
    for (const hit of res.data) {
      console.log(`  [${hit.score.toFixed(3)}] ${hit.payload.texto} -> ${hit.payload.respuesta} (${hit.payload.fuente}/${hit.payload.tipo})`);
    }
    return;
  }

  // Estado remoto actual (ids existentes) para el diff.
  const existing = await client.collectionExists();
  if (!existing.ok) {
    console.log(`Qdrant NO disponible en ${baseUrl}: ${existing.razon}`);
    console.log('Levantar con: docker compose up -d qdrant (sacd_system/)');
    process.exit(1);
  }
  const remoteIds: number[] = []; // Qdrant no expone ids por GET; el diff se hace contra el plan previo
  const plan = planMemorySync(corpus, remoteIds);

  console.log(`Memoria verificada: ${corpus.length} docs (learning/truth/*.json)`);
  console.log(`Plan: ${plan.crear.length} crear, ${plan.actualizar.length} actualizar, ${plan.borrar.length} borrar`);
  if (dryRun) {
    console.log('DRY-RUN: no se escribio nada en Qdrant.');
    write('resultTask/qdrant/memory-sync.plan.json', JSON.stringify({ dryRun: true, plan }, null, 2));
    return;
  }

  const res = await syncMemoryToQdrant(client, corpus, remoteIds);
  console.log(memorySyncSummary(res));
  if (!res.ok) process.exit(1);

  const out = {
    fecha: new Date().toISOString(),
    url: baseUrl,
    totalDocs: corpus.length,
    plan: res.data.plan,
    resumen: memorySyncSummary(res),
  };
  write('resultTask/qdrant/memory-sync.json', JSON.stringify(out, null, 2));
  write('resultTask/qdrant/README.md', buildReadme(corpus, res.data.plan, memorySyncSummary(res)));
  console.log('Escrito: resultTask/qdrant/memory-sync.json + README.md');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});