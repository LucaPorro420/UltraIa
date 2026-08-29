#!/usr/bin/env vite-node
// Task/zernio-demo.ts — demo Zernio MCP + sandbox (Fase B)
// Genera resultTask/zernio/ con lista de tools y plans (keyless, mock en tests, live opcional con ZERNIO_API_KEY).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createZernioClient } from '../packages/core/src/tools/zernio';
import { planSandboxExecution } from '../packages/core/src/tools/sandbox';

const outDir = join(process.cwd(), 'resultTask', 'zernio');
mkdirSync(outDir, { recursive: true });

async function main() {
  const client = createZernioClient();

  // 1. Intenta listar tools (live si hay red, fail-soft si no)
  let toolsResult: unknown;
  try {
    const res = await client.listTools();
    toolsResult = res;
    console.log(`[zernio-demo] listTools ok=${res.ok} ${res.ok ? `tools=${res.tools.length}` : `reason=${(res as { reason: string }).reason.slice(0, 100)}`}`);
  } catch (e) {
    toolsResult = { ok: false, reason: String(e).slice(0, 300) };
    console.log(`[zernio-demo] listTools error: ${String(e).slice(0, 200)}`);
  }

  // 2. Intenta initialize
  let initResult: unknown;
  try {
    const res = await client.initialize();
    initResult = res;
    console.log(`[zernio-demo] initialize ok=${(res as { ok: boolean }).ok}`);
  } catch (e) {
    initResult = { ok: false, reason: String(e).slice(0, 300) };
  }

  // 3. Sandbox plan (local vs e2b por env)
  const sandboxPlan = planSandboxExecution({ lang: 'python', code: 'print("hello zernio")\nfor i in range(3): print(i)' });
  console.log(`[zernio-demo] sandbox provider=${sandboxPlan.provider}`);

  const files: Record<string, unknown> = {
    'tools.json': toolsResult,
    'init.json': initResult,
    'sandbox.json': sandboxPlan,
    'config.json': { url: client.config.url, hasKey: !!client.config.apiKey, protocolVersion: client.config.protocolVersion },
  };

  for (const [name, data] of Object.entries(files)) {
    const p = join(outDir, name);
    writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[zernio-demo] ${name} → ${p}`);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    files: Object.keys(files),
    note: 'Demo Zernio MCP + sandbox (determinista, keyless-first). Con ZERNIO_API_KEY y red, tools.json contiene 50+ tools.',
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[zernio-demo] manifest.json → ${join(outDir, 'manifest.json')}`);
  console.log(`[zernio-demo] DONE — ${Object.keys(files).length + 1} archivos en ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
