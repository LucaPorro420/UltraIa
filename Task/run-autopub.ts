/**
 * AutoPub Autonomo — CLI del ciclo programado (iter-90, tarea #90).
 *
 * Ejecuta el ciclo completo de la fabrica de contenido:
 *   temas → briefs (cola) → contenido (es/ar + TTS opcional) → paquete por canal
 *   → cola Publication (hibrido: texto/blog APPROVED; video/imagen DRAFT humano)
 *   → publishDue opcional (publica los APPROVED vencidos; fail-soft sin tokens).
 *
 * Uso:
 *   npm run autopub                          # ciclo real (escribe cola)
 *   npm run autopub -- --dry-run             # sin escribir cola ni disco
 *   npm run autopub -- --publish-due --max 3 # ciclo + publicar vencidos
 *
 * Flags:
 *   --dry-run        no escribe cola ni marca briefs ni publica
 *   --max=N          briefs a procesar este ciclo (1-10, default 3)
 *   --idioma=es|ar   idioma del contenido (default es)
 *   --canales=a,b    subconjunto de canales (default: los 8)
 *   --publish-due    dispara publishDue al final del ciclo
 *   --tts            narracion edge-tts para guiones (keyless; falla soft)
 *   --db=URL         override de DATABASE_URL
 *   --out-dir=RUTA   donde escribir los reportes (default .ultraia/autopub)
 *
 * Reporte: <out-dir>/ciclo-<fecha>.json + .md. Exit code 0 si el ciclo no tuvo errores.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CANALES_AUTOPUB,
  defaultAutopubDeps,
  parseAutopubConfig,
  resumenAutopub,
  runAutopubCycle,
} from '../packages/core/src/tools/autopub';
import type { AutopubCanal } from '../packages/core/src/tools/autopub';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/** Flags que admiten valor separado por espacio ademas de `=`. */
const VALUE_FLAGS = new Set(['max', 'idioma', 'canales', 'db', 'out-dir']);

function parseArgs(argv: string[]): Map<string, string | boolean> {
  const flags = new Map<string, string | boolean>();
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const eq = body.indexOf('=');
    if (eq >= 0) {
      flags.set(body.slice(0, eq), body.slice(eq + 1));
      continue;
    }
    // `--max 3` (valor en el siguiente token) o `--dry-run` (booleano).
    if (VALUE_FLAGS.has(body) && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      flags.set(body, argv[++i]);
    } else {
      flags.set(body, true);
    }
  }
  return flags;
}

/** DATABASE_URL: flag > env > .env raiz > apps/web/.env > fallback absoluto a core/prisma/dev.db. */
function resolverDatabaseUrl(flagDb?: string): string {
  if (flagDb) return flagDb;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const rel of ['.env', join('apps', 'web', '.env')]) {
    const p = join(root, rel);
    if (!existsSync(p)) continue;
    try {
      for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
        if (m) return m[1].trim().replace(/^["']|["']$/g, '');
      }
    } catch {
      // lectura fallida → siguiente candidato
    }
  }
  return `file:${join(root, 'packages', 'core', 'prisma', 'dev.db')}`;
}

async function main(): Promise<number> {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.has('help')) {
    console.log('Uso: npm run autopub [-- --dry-run|--max=N|--idioma=es|ar|--canales=a,b|--publish-due|--tts|--db=URL|--out-dir=RUTA]');
    return 0;
  }

  const canalesFlag = typeof flags.get('canales') === 'string' ? String(flags.get('canales')).split(',').map((c) => c.trim()) : undefined;
  const configParsed = parseAutopubConfig({
    maxBriefs: Number(flags.get('max') ?? undefined),
    idioma: flags.get('idioma') ?? undefined,
    canales: canalesFlag,
    tts: flags.has('tts'),
    publishDue: flags.has('publish-due'),
  });
  const config = configParsed.config;

  const dryRun = flags.has('dry-run');
  const outDir = typeof flags.get('out-dir') === 'string' ? String(flags.get('out-dir')) : join(root, '.ultraia', 'autopub');

  console.log(`[autopub] inicio ${new Date().toISOString()}${dryRun ? ' (DRY-RUN: no escribe cola)' : ''}`);
  console.log(`[autopub] config: max=${config.maxBriefs} idioma=${config.idioma} tts=${config.tts} publishDue=${config.publishDue} canales=${config.canales.join(',')}`);

  // El cliente Prisma lee DATABASE_URL al instanciarse → resolverla ANTES del import dinamico.
  process.env.DATABASE_URL = resolverDatabaseUrl(typeof flags.get('db') === 'string' ? String(flags.get('db')) : undefined);

  let deps;
  try {
    const dbModule = await import('../packages/core/src/db/client');
    deps = defaultAutopubDeps(dbModule.prisma as never, { dryRun });
  } catch (e) {
    console.error(`[autopub] FATAL: no se pudo abrir la base de datos (${e instanceof Error ? e.message : String(e)})`);
    console.error('[autopub] pista: corre `npm run db:migrate` o pasa --db=file:/ruta/dev.db');
    return 2;
  }

  if (dryRun) {
    console.log('[autopub] plan F1: descubrir temas (red keyless, sin guardar)');
    console.log('[autopub] plan F2-F4: generar contenido y encolar en modo DRY (sin escribir cola ni disco)');
  }

  const report = await runAutopubCycle(deps, config);
  const resumen = resumenAutopub(report);

  try {
    mkdirSync(outDir, { recursive: true });
    const stamp = report.fechaIso.replace(/[:.]/g, '-');
    writeFileSync(join(outDir, `ciclo-${stamp}.json`), JSON.stringify(report, null, 2), 'utf8');
    writeFileSync(join(outDir, `ciclo-${stamp}.md`), resumen, 'utf8');
    console.log(`[autopub] reporte: ${join(outDir, `ciclo-${stamp}.md`)}`);
  } catch (e) {
    console.warn(`[autopub] aviso: no se pudo escribir el reporte (${e instanceof Error ? e.message : String(e)})`);
  }

  console.log(resumen);
  console.log(`[autopub] fin ok=${report.ok} procesados=${report.procesados.length} errores=${report.errores.length}`);
  return report.ok ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((e) => {
    console.error(`[autopub] FATAL: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 2;
  });

// Referencia util para consumidores externos (sin efecto en runtime).
export const _canalesDisponibles: readonly AutopubCanal[] = CANALES_AUTOPUB;
