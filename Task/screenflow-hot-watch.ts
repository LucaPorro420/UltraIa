/**
 * screenflow-hot-watch.ts — runner del hot watch de ScreenFlow.
 *
 * Vigila `.ultraia/hot/` por scripts JSON nuevos, los ejecuta via
 * `run_screenflow.ts` y crea la Publication en la cola (canal `blog`,
 * auto-approve) para métricas + respaldo cloud opcional.
 *
 * Uso:
 *   node_modules\.bin\vite-node.cmd Task/screenflow-hot-watch.ts --once --db --cloud
 *   node_modules\.bin\vite-node.cmd Task/screenflow-hot-watch.ts --interval=10000
 *
 * Flags:
 *   --once        un solo barrido (útil en tests/CI)
 *   --interval N  ms entre barridos (default 10000)
 *   --db          usa Prisma real (requiere DATABASE_URL); sin flag → mock en memoria
 *   --cloud       inyecta CloudService (Local o R2) para respaldo
 *   --hot-dir DIR carpeta a vigilar (default .ultraia/hot)
 *   --dry-run     no ejecuta run_screenflow.ts ni crea Publication (solo detecta)
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync, renameSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  resolveHotWatch,
  buildPublicationPackage,
  buildManifest,
  planRuns,
  type ActionScript,
  type PublicationPackage,
  HOT_DIR,
  RECORDINGS_ROOT,
} from '../packages/core/src/tools/screenflow';
import { createPublication, guardarPaqueteEnCloud, type CloudService, type Db, type PublicationEstado } from '../packages/core/src/domain/publications';

// ---- Mock Prisma / DB para tests (sin --db flag) ----
function createMockDb(): Db {
  const store = new Map<string, any>();
  let idCounter = 0;
  return {
    publication: {
      create: async (args: any) => {
        const id = `pub_${++idCounter}_${Date.now()}`;
        const pub = { ...args.data, id, createdAt: new Date(), updatedAt: new Date() };
        store.set(id, pub);
        return pub;
      },
      findUnique: async (args: any) => store.get(args.where.id) ?? null,
      findMany: async (args: any) => Array.from(store.values()),
      update: async (args: any) => {
        const existing = store.get(args.where.id);
        if (!existing) throw new Error('not found');
        const updated = { ...existing, ...args.data, updatedAt: new Date() };
        store.set(args.where.id, updated);
        return updated;
      },
    },
  } as unknown as Db;
}

// ---- CloudService mock (sin --cloud flag) ----
function createMockCloud(): CloudService {
  return {
    upload: async (name: string, bytes: Uint8Array, dir?: string) => {
      const path = `${dir ?? 'drafts'}/${name}`;
      return { path, size: bytes.length, uploadedAt: new Date().toISOString() };
    },
    list: async (dir?: string) => [],
    read: async (path: string) => null,
    remove: async (path: string) => { },
    stat: async (path: string) => null,
    manifest: async () => ({ files: [], totalBytes: 0, byType: {} }),
  };
}

// ---- CLI args ----
const argv = process.argv.slice(2);
const flags = {
  once: argv.includes('--once'),
  interval: Number(argv.find((a) => a.startsWith('--interval='))?.split('=')[1] ?? '10000'),
  useDb: argv.includes('--db'),
  useCloud: argv.includes('--cloud'),
  hotDir: argv.find((a) => a.startsWith('--hot-dir='))?.split('=')[1] ?? HOT_DIR,
  dryRun: argv.includes('--dry-run'),
};

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const hotDirAbs = resolve(root, flags.hotDir);
const doneDirAbs = resolve(hotDirAbs, 'done');

if (!existsSync(hotDirAbs)) mkdirSync(hotDirAbs, { recursive: true });
if (!existsSync(doneDirAbs)) mkdirSync(doneDirAbs, { recursive: true });

const db = flags.useDb ? await import('../packages/core/db/client').then((m) => m.default) : createMockDb();
const cloud = flags.useCloud ? await import('../packages/core/tools/cloud').then((m) => m.localCloudAdapter()) : createMockCloud();

function log(msg: string) {
  console.log(`[hot-watch ${new Date().toISOString()}] ${msg}`);
}

function logErr(msg: string) {
  console.error(`[hot-watch ${new Date().toISOString()}] ERROR: ${msg}`);
}

// ---- Estado del watch (known files) ----
let knownFiles: string[] = [];

async function sweepOnce(): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  let current: string[];
  try {
    current = readdirSync(hotDirAbs);
  } catch (err) {
    logErr(`no se pudo leer ${hotDirAbs}: ${err instanceof Error ? err.message : String(err)}`);
    return { processed, failed };
  }

  const { nuevos, conocidos } = resolveHotWatch(current, knownFiles);
  knownFiles = conocidos;

  if (nuevos.length === 0) {
    log(`barrido: 0 nuevos (conocidos: ${conocidos.length})`);
    return { processed, failed };
  }

  log(`barrido: ${nuevos.length} script(s) nuevo(s) — ${nuevos.join(', ')}`);

  for (const file of nuevos) {
    const scriptPath = join(hotDirAbs, file);
    let script: ActionScript;
    try {
      script = JSON.parse(readFileSync(scriptPath, 'utf8'));
    } catch (err) {
      logErr(`script inválido ${file}: ${err instanceof Error ? err.message : String(err)}`);
      moveToDone(file);
      failed++;
      continue;
    }

    log(`procesando ${file} (${script.name})`);

    // 1. Validar script
    const v = screenflow.validateActionScript(script);
    if (!v.ok) {
      logErr(`validación falló ${file}: ${v.errors.join('; ')}`);
      moveToDone(file);
      failed++;
      continue;
    }
    v.warnings.forEach((w) => log(`warn: ${w}`));

    // 2. Ejecutar run_screenflow.ts (spawn) — sin --dry-run
    if (!flags.dryRun) {
      const runArgs = [
        'Task/run_screenflow.ts',
        scriptPath,
        // --run-id se genera dentro del runner; no lo pasamos para que use timestamp
      ];
      const result = spawnSync('node_modules\\.bin\\vite-node.cmd', runArgs, {
        cwd: root,
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 5 * 60 * 1000, // 5 min max
      });

      if (result.status !== 0) {
        logErr(`run_screenflow falló para ${file}: ${result.stderr?.slice(0, 500) ?? result.stdout?.slice(0, 500) ?? 'sin output'}`);
        moveToDone(file);
        failed++;
        continue;
      }
      log(`run_screenflow OK: ${result.stdout?.trim()}`);
    }

    // 3. Crear Publication en cola (blog → auto-approve)
    const now = new Date();
    const runId = `${now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${script.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
    const naming = screenflow.buildOutputNaming(runId, script.name);
    const manifest = buildManifest(runId, script, planRuns(script));
    const pkg = buildPublicationPackage(runId, script, manifest);

    const pubResult = await createPublication(db, {
      paquete: pkg,
      canal: 'blog',
      scheduledAt: null, // inmediato
      creadoPorId: 'screenflow-hot-watch',
      cloud: flags.useCloud ? cloud : undefined,
    });

    log(`Publication creada: ${pubResult.id} (estado=${pubResult.estado}, requiereAprobacion=${pubResult.requiereAprobacion})`);

    // 4. Mover script a done/
    moveToDone(file);
    processed++;
  }

  return { processed, failed };
}

function moveToDone(file: string) {
  try {
    renameSync(join(hotDirAbs, file), join(doneDirAbs, file));
  } catch {
    // ignore
  }
}

// ---- Main loop ----
async function main() {
  log(`iniciando hot watch en ${hotDirAbs} (interval=${flags.interval}ms, once=${flags.once}, db=${flags.useDb}, cloud=${flags.useCloud})`);

  if (flags.once) {
    const res = await sweepOnce();
    log(`completado: processed=${res.processed}, failed=${res.failed}`);
    process.exit(res.failed > 0 ? 1 : 0);
  }

  // Loop continuo
  while (true) {
    try {
      const res = await sweepOnce();
      if (res.processed > 0 || res.failed > 0) {
        log(`barrido completado: processed=${res.processed}, failed=${res.failed}`);
      }
    } catch (err) {
      logErr(`error en barrido: ${err instanceof Error ? err.message : String(err)}`);
    }
    await new Promise((r) => setTimeout(r, flags.interval));
  }
}

main().catch((err) => {
  logErr(`fatal: ${err.stack ?? err.message}`);
  process.exit(1);
});

// ---- Import screenflow namespace (para validateActionScript etc) ----
import * as screenflow from '../packages/core/src/tools/screenflow';