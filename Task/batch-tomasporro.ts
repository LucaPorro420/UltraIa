#!/usr/bin/env node
/**
 * Batch generator for @tomassporro AI travel videos
 * Runs Task/run-tomasporro.ts with multiple destination/style/duration combinations
 */

import { spawnSync } from 'node:child_process';

const DESTINOS = [
  'Cusco',
  'Machu Picchu',
  'Patagonia',
];

const ESTILOS = ['naturaleza', 'aventura', 'relax', 'cultura'] as const;

const DURACIONES = [30, 45];

async function runSingle(destino: string, estilo: typeof ESTILOS[number], duracion: number, attempt = 1): Promise<boolean> {
  const args = [
    'npx', 'vite-node', 'Task/run-tomasporro.ts',
    '--destino', destino,
    '--estilo', estilo,
    '--duracion', String(duracion),
  ];
  console.log(`\n🎬 ${destino} | ${estilo} | ${duracion}s${attempt > 1 ? ` (retry ${attempt})` : ''}`);
  const result = spawnSync('cmd', ['/c', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    timeout: 600000,
    stdio: 'pipe',
  });
  if (result.error) {
    console.error(`  ❌ Error: ${result.error.message}`);
    return attempt < 3 ? await retryWithDelay(destino, estilo, duracion, attempt) : false;
  }
  if (result.status !== 0) {
    const err = result.stderr || result.stdout;
    const isRateLimit = err.includes('500') || err.includes('fetch failed') || err.includes('rate');
    if (isRateLimit && attempt < 3) {
      console.log(`  ⚠ Rate limited, retrying...`);
      return await retryWithDelay(destino, estilo, duracion, attempt);
    }
    console.error(`  ❌ Failed (code ${result.status}): ${err?.slice(-500)}`);
    return false;
  }
  // Extract output path from stdout
  const match = (result.stdout || '').match(/📁 (.+\.mp4)/);
  if (match) {
    console.log(`  ✅ ${match[1]}`);
  } else {
    console.log(`  ✅ Done`);
  }
  return true;
}

async function retryWithDelay(destino: string, estilo: typeof ESTILOS[number], duracion: number, attempt: number): Promise<boolean> {
  const delayMs = attempt * 15000; // 15s, 30s
  console.log(`  ⏳ Waiting ${delayMs/1000}s before retry...`);
  await new Promise(r => setTimeout(r, delayMs));
  return runSingle(destino, estilo, duracion, attempt + 1);
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  UltraIa — Batch AI Travel Videos for @tomassporro         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\n📋 Matrix: ${DESTINOS.length} destinos × ${ESTILOS.length} estilos × ${DURACIONES.length} duraciones = ${DESTINOS.length * ESTILOS.length * DURACIONES.length} videos (con reintentos)`);

  let success = 0;
  let failed = 0;
  const startAll = Date.now();

  for (const destino of DESTINOS) {
    for (const estilo of ESTILOS) {
      for (const duracion of DURACIONES) {
        const ok = await runSingle(destino, estilo, duracion);
        if (ok) success++; else failed++;
      }
    }
  }

  const totalTime = ((Date.now() - startAll) / 1000 / 60).toFixed(1);
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  Batch complete in ${totalTime} min                              ║`);
  console.log(`║  ✅ Success: ${success}  ❌ Failed: ${failed}                              ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
}

main().catch((e) => {
  console.error('💥 Batch fatal:', e);
  process.exit(1);
});