/**
 * scripts/reporeview-run.ts — Runner del agente revisor de repos (iter-107).
 *
 * Analiza un alcance del árbol (vendor | sources | docs | src | all), extrae
 * insights en 6 dimensiones de aprendizaje y documenta el resultado:
 *   .ultraia/reporeview/<runId>/{manifest.json, insights.json, report.md, truth-batch.json}
 *
 * Con --sync fusiona el lote nuevo con el corpus COMPLETO learning/truth/*.json
 * y sincroniza a la nube documental Qdrant (local 127.0.0.1:6333 o servidor vía
 * --qdrant-url / env QDRANT_URL; api-key vía env QDRANT_API_KEY).
 *
 * Uso:
 *   node_modules\.bin\vite-node.cmd scripts/reporeview-run.ts [--targets=vendor,sources]
 *     [--max-files=300] [--dry-run] [--sync] [--qdrant-url=http://...] [--out=<dir>]
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildReportMarkdown,
  buildReviewManifest,
  buildTruthDocs,
  dedupeResults,
  extractInsights,
  planRepoReview,
  type ReviewResult,
  type ReviewScope,
} from '../packages/core/src/tools/reporeview';
import { loadTruthCorpus } from '../packages/core/src/tools/semantic-memory';
import { createQdrantClient, memorySyncSummary, syncMemoryToQdrant } from '../packages/core/src/tools/qdrant-memory';

const root = process.env.ULTRAIA_ROOT ?? process.cwd();

function argValue(flag: string): string | undefined {
  const argv = process.argv.slice(2);
  for (const a of argv) {
    if (a.startsWith(`--${flag}=`)) return a.slice(flag.length + 3);
    if (a === `--${flag}`) return 'true';
  }
  return undefined;
}

function runIdFor(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function main(): Promise<void> {
  const dryRun = argValue('dry-run') === 'true';
  const doSync = argValue('sync') === 'true';
  const targetsArg = argValue('targets') ?? 'all';
  const maxFiles = Number(argValue('max-files') ?? 300);
  const outOverride = argValue('out');
  const qdrantUrl =
    argValue('qdrant-url') ?? process.env.QDRANT_URL ?? 'http://127.0.0.1:6333';

  const scopes = targetsArg
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is ReviewScope => s in ({ vendor: 1, sources: 1, docs: 1, src: 1, all: 1 } as const));

  const runId = runIdFor();
  const results: ReviewResult[] = [];

  console.log(`[reporeview] run=${runId} scopes=${scopes.join(',') || '(ninguno)'} maxFiles=${maxFiles} dryRun=${dryRun}`);

  let totalTargets = 0;
  for (const scope of scopes) {
    const plan = planRepoReview(root, scope, maxFiles);
    totalTargets += plan.targets.length;
    for (const t of plan.targets) {
      try {
        const content = readFileSync(`${root}/${t.path}`, 'utf8');
        const analysis = extractInsights(t.path, content);
        results.push({ path: t.path, ...analysis });
      } catch {
        /* fail-soft por archivo */
      }
    }
    if (plan.truncated) {
      console.log(`[reporeview] aviso: scope ${scope} truncado en maxFiles=${plan.maxFiles}`);
    }
  }

  const unique = dedupeResults(results);
  const truthBatch = buildTruthDocs(unique, `reporeview-${runId}`);
  const manifest = buildReviewManifest(runId, root, scopes.join('+'), unique);

  console.log(
    `[reporeview] objetivos=${totalTargets} analizados=${unique.length} truthDocs=${truthBatch.length}`,
  );
  console.log(`[reporeview] techs top: ${manifest.topTechs.slice(0, 5).map((t) => `${t.name}(${t.count})`).join(', ') || '—'}`);

  if (dryRun) {
    console.log('[reporeview] dry-run: no se escribe ni se sincroniza nada.');
    return;
  }

  const outDir = outOverride ?? join(root, '.ultraia', 'reporeview', runId);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  writeFileSync(join(outDir, 'insights.json'), JSON.stringify(unique, null, 2), 'utf8');
  writeFileSync(join(outDir, 'report.md'), buildReportMarkdown(manifest), 'utf8');
  writeFileSync(join(outDir, 'truth-batch.json'), JSON.stringify({ source: `reporeview-${runId}`, cases: truthBatch }, null, 2), 'utf8');
  console.log(`[reporeview] artefactos en ${outDir}`);

  if (!doSync) {
    console.log('[reporeview] --sync no indicado: lote disponible para revisión manual.');
    return;
  }

  // Nube documental: corpus COMPLETO + lote nuevo (nunca solo el lote).
  const truthDir = join(root, 'learning', 'truth');
  let files: string[] = [];
  try {
    files = (await import('node:fs')).readdirSync(truthDir).filter((f) => f.endsWith('.json'));
  } catch {
    files = [];
  }
  const corpus = loadTruthCorpus(
    files.map((f) => ({
      id: f.replace(/\.json$/, ''),
      source: f,
      cases: JSON.parse(readFileSync(join(truthDir, f), 'utf8')) as unknown,
    })),
  );
  const byId = new Map(corpus.map((d) => [d.id, d]));
  for (const d of truthBatch) byId.set(d.id, d);
  const merged = [...byId.values()];

  const client = createQdrantClient(qdrantUrl, process.env.QDRANT_API_KEY);
  const res = await syncMemoryToQdrant(client, merged, []);
  console.log(memorySyncSummary(res));
  console.log(`[reporeview] nube: ${merged.length} docs totales (${corpus.length} previos + ${truthBatch.length} nuevos de esta revisión)`);
  if (!res.ok) process.exit(1);
}

main().catch((e: unknown) => {
  console.error('[reporeview] error:', e);
  process.exit(1);
});
