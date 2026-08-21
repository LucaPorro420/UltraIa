#!/usr/bin/env node
/**
 * Run remaining Machu Picchu + Patagonia videos
 */

import { spawnSync } from 'node:child_process';

const COMBOS = [
  { destino: 'Machu Picchu', estilo: 'naturaleza', duracion: 30 },
  { destino: 'Machu Picchu', estilo: 'naturaleza', duracion: 45 },
  { destino: 'Machu Picchu', estilo: 'aventura', duracion: 30 },
  { destino: 'Machu Picchu', estilo: 'aventura', duracion: 45 },
  { destino: 'Machu Picchu', estilo: 'relax', duracion: 30 },
  { destino: 'Machu Picchu', estilo: 'relax', duracion: 45 },
  { destino: 'Machu Picchu', estilo: 'cultura', duracion: 30 },
  { destino: 'Machu Picchu', estilo: 'cultura', duracion: 45 },
  { destino: 'Patagonia', estilo: 'naturaleza', duracion: 30 },
  { destino: 'Patagonia', estilo: 'naturaleza', duracion: 45 },
  { destino: 'Patagonia', estilo: 'aventura', duracion: 30 },
  { destino: 'Patagonia', estilo: 'aventura', duracion: 45 },
  { destino: 'Patagonia', estilo: 'relax', duracion: 30 },
  { destino: 'Patagonia', estilo: 'relax', duracion: 45 },
  { destino: 'Patagonia', estilo: 'cultura', duracion: 30 },
  { destino: 'Patagonia', estilo: 'cultura', duracion: 45 },
];

async function run(c) {
  const args = ['npx', 'vite-node', 'Task/run-tomasporro.ts', '--destino', c.destino, '--estilo', c.estilo, '--duracion', String(c.duracion)];
  console.log(`\n🎬 ${c.destino} | ${c.estilo} | ${c.duracion}s`);
  const r = spawnSync('cmd', ['/c', ...args], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 50*1024*1024, timeout: 600000, stdio: 'pipe' });
  if (r.error) { console.error(`  ❌ ${r.error.message}`); return false; }
  if (r.status !== 0) {
    const err = (r.stderr||r.stdout||'').slice(-400);
    console.error(`  ❌ Failed: ${err}`);
    return false;
  }
  const m = (r.stdout||'').match(/📁 (.+\.mp4)/);
  console.log(m ? `  ✅ ${m[1]}` : '  ✅ Done');
  return true;
}

async function main() {
  let ok = 0, fail = 0;
  for (const c of COMBOS) {
    const s = await run(c);
    s ? ok++ : fail++;
    if (fail > 3) { console.log('\n⚠ Too many failures, stopping'); break; }
    await new Promise(r => setTimeout(r, 20000)); // 20s delay between videos
  }
  console.log(`\n🏁 Complete: ✅ ${ok} ❌ ${fail}`);
}

main();