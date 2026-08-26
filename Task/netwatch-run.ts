// -----------------------------------------------------------------------------
// netwatch-run.ts — runner REAL del watchdog WiFi/red (capability `netwatch`).
// -----------------------------------------------------------------------------
// QUÉ: ejecuta ticks de Sensado→Decisión→Acción→Auditoría contra el sistema:
//   netsh wlan show interfaces → parse → ping probe (hosts config) →
//   decideNetAction → ejecuta reconnect (netsh) si procede → audit.ndjson +
//   state.json en .ultraia/netwatch/.
// POR QUÉ así: el dominio (tools/netwatch.ts) es puro y testeable; este runner
//   es la ÚNICA pieza que toca procesos/fs (patrón cerebro-cycle/autopub).
// USO:
//   node_modules\.bin\vite-node.cmd Task/netwatch-run.ts --once            # tick único
//   ... Task/netwatch-run.ts --watch 60                                    # continuo cada 60s
//   ... Task/netwatch-run.ts --once --dry-run                              # nunca muta
//   ... Task/netwatch-run.ts --schedule --every 5                          # imprime argv schtasks/cron
// Flags: --once | --watch [seg] | --interval seg | --profile nombre |
//        --no-connect | --dry-run | --dir ruta | --task-name T | --every N | --schedule
// EXIT: 0 = online; 1 = degradado (sin red o sin interfaz); fail-soft, nunca lanza.
// -----------------------------------------------------------------------------

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  auditEntryNdjson,
  decideNetAction,
  type NetAuditEntry,
  type WlanInterface,
  netshConnectArgv,
  netshProfilesArgv,
  netshStatusArgv,
  netwatchCronLine,
  netwatchSchtasksArgv,
  parsePingOutput,
  parseWlanInterfaces,
  pingProbeArgv,
  probeSequence,
  resolveNetWatchConfig,
  wifiSummary,
} from '../packages/core/src/tools/netwatch';

/* Args ---------------------------------------------------------------------- */

interface RunArgs {
  watchSeg: number | null;
  intervaloSeg?: number;
  perfil?: string;
  autoConnect: boolean;
  dryRun: boolean;
  dir: string;
  taskName: string;
  everyMin: number;
  schedule: boolean;
}

function parseArgs(argv: string[]): RunArgs {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i < 0) return undefined;
    const v = argv[i + 1];
    return v && !v.startsWith('--') ? v : '';
  };
  const has = (name: string) => argv.includes(`--${name}`);
  return {
    watchSeg: has('watch') ? Number.parseInt(get('watch') || '0', 10) || null : null,
    intervaloSeg: get('interval') ? Number.parseInt(get('interval') as string, 10) : undefined,
    perfil: get('profile') || undefined,
    autoConnect: !has('no-connect'),
    dryRun: has('dry-run'),
    dir: get('dir') || join(process.cwd(), '.ultraia', 'netwatch'),
    taskName: get('task-name') || 'UltraIa-NetWatch',
    everyMin: get('every') ? Number.parseInt(get('every') as string, 10) : 5,
    schedule: has('schedule'),
  };
}

/* IO helpers ----------------------------------------------------------------- */

/** Decoding robusto de la consola Windows: utf8 primero; latin1 si hay U+FFFD
 * (netsh emite cp850/cp1252 → "Señal" llega rota). */
function decode(buf: Buffer): string {
  const asUtf8 = buf.toString('utf8');
  return asUtf8.includes('\uFFFD') ? buf.toString('latin1') : asUtf8;
}

function runCapture(argv: string[]): { out: string; code: number } {
  try {
    const res = spawnSync(argv[0]!, argv.slice(1), { encoding: 'buffer', timeout: 15000 });
    const out = `${decode(res.stdout ?? Buffer.alloc(0))}\n${decode(res.stderr ?? Buffer.alloc(0))}`;
    return { out, code: res.status ?? 1 };
  } catch {
    return { out: '', code: 1 };
  }
}

function readAuditEntries(file: string): NetAuditEntry[] {
  if (!existsSync(file)) return [];
  try {
    return readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => l.trim().startsWith('{'))
      .slice(-200)
      .map((l) => JSON.parse(l) as NetAuditEntry);
  } catch {
    return [];
  }
}

/* Tick ------------------------------------------------------------------------ */

interface TickResult {
  decision: ReturnType<typeof decideNetAction>['accion'];
  online: boolean;
}

function tick(args: RunArgs, now: Date): TickResult {
  const cfg = resolveNetWatchConfig({
    ...(args.intervaloSeg ? { intervaloSeg: args.intervaloSeg } : {}),
    ...(args.perfil ? { perfilPreferido: args.perfil } : {}),
    autoConnect: args.autoConnect,
  });

  mkdirSync(args.dir, { recursive: true });
  const auditFile = join(args.dir, 'audit.ndjson');
  const stateFile = join(args.dir, 'state.json');

  // SENSAR
  const status = runCapture(netshStatusArgv());
  let interfaces: WlanInterface[] = parseWlanInterfaces(status.out);
  if (interfaces.length === 0) {
    // Sin adaptador visible: confirmar con show profiles (desktop ethernet).
    const profiles = runCapture(netshProfilesArgv());
    if (!profiles.out.trim()) interfaces = [];
  }
  const summary = wifiSummary(interfaces);

  const probes = cfg.hosts.map((host) => {
    const p = runCapture(pingProbeArgv(host));
    return { host, ok: parsePingOutput(p.out).ok };
  });
  const probe = probeSequence(probes);

  // Rate-limit desde la auditoría (sólo acciones mutantes = reconnect).
  const horaAtras = now.getTime() - 3600_000;
  const recientes = readAuditEntries(auditFile).filter(
    (e) => e.decision === 'reconnect' && new Date(e.ts).getTime() >= horaAtras,
  );
  let ultimaMutaTs: number | null = null;
  for (const e of recientes) {
    const t = new Date(e.ts).getTime();
    if (Number.isFinite(t)) ultimaMutaTs = Math.max(ultimaMutaTs ?? t, t);
  }
  const ultimaAccionHaceSeg =
    ultimaMutaTs !== null ? Math.round((now.getTime() - ultimaMutaTs) / 1000) : null;

  // DECIDIR
  const decision = decideNetAction({
    summary,
    probeOk: probe.ok,
    accionesRecientes: recientes.length,
    ultimaAccionHaceSeg,
    config: cfg,
  });

  // ACTUAR
  let resultado: 'ok' | 'fallo' | null = null;
  let argvEjecutado: string[] | null = null;
  if (decision.muta && decision.argv) {
    if (args.dryRun) {
      console.log(`[netwatch][dry-run] ${decision.accion}: ${decision.argv.join(' ')}`);
      resultado = null;
    } else {
      const res = runCapture(decision.argv);
      argvEjecutado = decision.argv;
      resultado = res.code === 0 ? 'ok' : 'fallo';
    }
  }

  // AUDITAR
  const entry: NetAuditEntry = {
    ts: now.toISOString(),
    decision: decision.accion,
    razon: decision.razon,
    ssid: summary?.ssid ?? null,
    senalPct: summary?.senalPct ?? null,
    probeOk: probe.ok,
    argvEjecutado,
    resultado,
  };
  try {
    appendFileSync(auditFile, auditEntryNdjson(entry) + '\n', 'utf8');
    writeFileSync(
      stateFile,
      JSON.stringify(
        {
          version: 1,
          ultimoTs: entry.ts,
          decision: entry.decision,
          razon: entry.razon,
          ssid: entry.ssid,
          senalPct: entry.senalPct,
          probeOk: entry.probeOk,
          hostQueRespondio: probe.hostQueRespondio,
          autoConnect: cfg.autoConnect,
          dryRun: args.dryRun,
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );
  } catch (err) {
    console.error(`[netwatch] auditoría no escribible: ${String(err)}`);
  }

  const online = summary?.connected === true && probe.ok;
  console.log(
    `[netwatch] ${entry.ts} decision=${decision.accion} razon=${decision.razon} ` +
      `ssid=${entry.ssid ?? '-'} señal=${entry.senalPct ?? '-'}% probe=${probe.ok} → exit ${online ? 0 : 1}`,
  );
  return { decision: decision.accion, online };
}

/* Main -------------------------------------------------------------------------- */

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.schedule) {
    // eslint-disable-next-line no-console
    console.log('[netwatch] schtasks:', JSON.stringify(netwatchSchtasksFor(args), null, 2));
    console.log('[netwatch] cron:', netwatchCronFor(args));
    process.exit(0);
  }

  if (args.watchSeg !== null) {
    const seg = Math.max(15, args.watchSeg || resolveNetWatchConfig({}).intervaloSeg);
    console.log(`[netwatch] modo continuo cada ${seg}s (Ctrl+C para salir)`);
    const loop = (): void => {
      try {
        tick(args, new Date());
      } catch (err) {
        console.error(`[netwatch] tick falló (fail-soft): ${String(err)}`);
      }
    };
    loop();
    setInterval(loop, seg * 1000);
    return; // el proceso vive por el setInterval
  }

  const r = tick(args, new Date());
  process.exit(r.online ? 0 : 1);
}

function netwatchSchtasksFor(args: RunArgs): { cmd: string; args: string[] } {
  return netwatchSchtasksArgv({
    taskName: args.taskName,
    cadaNMinutos: args.everyMin,
    workdir: process.cwd(),
  });
}
function netwatchCronFor(args: RunArgs): string {
  return netwatchCronLine({
    taskName: args.taskName,
    cadaNMinutos: args.everyMin,
    workdir: process.cwd(),
  });
}

main();
