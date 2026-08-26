// -----------------------------------------------------------------------------
// netwatch.ts — capability `netwatch`: watchdog WiFi/red con decisiones
// auditables (UltraIa).
// -----------------------------------------------------------------------------
// QUÉ ES: dominio PURO y determinista que mantiene el dispositivo CONECTADO:
//   1) SENSE  — parseWlanInterfaces/parseWlanProfiles/parsePingOutput sobre la
//      salida cruda de `netsh wlan` y `ping` (locale ES+EN tolerante a acentos).
//   2) DECIDE — decideNetAction aplica política determinista con anti-thrash
//      (enfriamiento + tope horario) y devuelve SIEMPRE una razón auditable.
//   3) ACT    — argv exactos de netsh/ping para que el runner ejecute.
//   4) AUDIT  — auditEntry serializa cada decisión como línea NDJSON.
// PARA QUÉ: "controla el wifi también para autoconectarte estando el dispositivo
//   encendido" (InfoPeticion.txt 26/08) + registro auditable de decisiones para
//   los modos P-P/P-B (pre-flight de red) y el Cerebro/heartbeat.
// POR QUÉ así: el dominio no toca fs/red/procesos (testeable 100% con fixtures);
//   la EJECUCIÓN real vive en Task/netwatch-run.ts (vite-node) y el AGENDADO en
//   scripts/netwatch-schedule.ps1. Patrón cerebro/screenflow/autopub.
// VERDAD (capturada de esta máquina, locale español):
//   `Estado : conectado` / `SSID : Norma-2.4` / `Señal : 72%` / `Perfil : Norma-2.4`.
//   TRAMPA: "desconectado" CONTIENE "conectado" → la normalización comprueba la
//   negación PRIMERO (ídem EN disconnected/connected).
// -----------------------------------------------------------------------------

import { z } from 'zod';

/* Configuración ----------------------------------------------------------- */

export const netwatchConfigSchema = z.object({
  /** Hosts de sonda de conectividad (orden = prioridad). */
  hosts: z.array(z.string().min(3).max(253)).min(1).max(4).default(['1.1.1.1', '8.8.8.8']),
  /** Segundos entre ticks del watchdog (runner continuo o schtasks). */
  intervaloSeg: z.number().int().min(15).max(3600).default(60),
  /** Segundos mínimos entre acciones mutantes (anti-thrash). */
  enfriamientoSeg: z.number().int().min(30).max(3600).default(120),
  /** Tope de acciones mutantes por hora (protege al router y al log). */
  maxAccionesPorHora: z.number().int().min(1).max(12).default(6),
  /** Permitir reconexión automática (false = sólo reportar). */
  autoConnect: z.boolean().default(true),
  /** Perfil WiFi preferido si hay varios (default: último perfil visto). */
  perfilPreferido: z.string().min(1).max(64).optional(),
});
export type NetWatchConfig = z.input<typeof netwatchConfigSchema>;
export type ResolvedNetWatchConfig = z.output<typeof netwatchConfigSchema>;

export function resolveNetWatchConfig(input: NetWatchConfig = {}): ResolvedNetWatchConfig {
  return netwatchConfigSchema.parse(input);
}

/* Sensado: parsers sobre salida cruda ------------------------------------- */

/** Quita diacríticos y pasa a minúsculas (labels ES con acentos → ES sin). */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export interface WlanInterface {
  nombre: string;
  descripcion: string | null;
  /** 'connected' | 'disconnected' | 'authenticating' | 'other' */
  estado: 'connected' | 'disconnected' | 'authenticating' | 'other';
  estadoCrudo: string;
  ssid: string | null;
  senalPct: number | null;
  perfil: string | null;
}

/** Normaliza el valor crudo de Estado evitando la trama substring
 * ("desconectado".includes("conectado") === true). */
function normalizeEstado(crudo: string): WlanInterface['estado'] {
  const v = stripDiacritics(crudo);
  if (/desconectad|^disconnect|not connected/.test(v)) return 'disconnected';
  if (/conectad|^connected/.test(v)) return 'connected';
  if (/autentic|validat|associat/.test(v)) return 'authenticating';
  return 'other';
}

function fieldFromLine(line: string): { key: string; value: string } | null {
  const idx = line.indexOf(':');
  if (idx <= 0) return null;
  const key = stripDiacritics(line.slice(0, idx)).trim();
  const value = line.slice(idx + 1).trim();
  if (!key || !value) return null;
  return { key, value };
}

/**
 * Parsea la salida de `netsh wlan show interfaces` (ES o EN).
 * Cada bloque de interfaz empieza en una línea Nombre/Name.
 */
export function parseWlanInterfaces(raw: string): WlanInterface[] {
  const out: WlanInterface[] = [];
  let current: Partial<WlanInterface> | null = null;

  const flush = () => {
    if (!current || !current.nombre) return;
    out.push({
      nombre: current.nombre,
      descripcion: current.descripcion ?? null,
      estado: current.estado ?? 'other',
      estadoCrudo: current.estadoCrudo ?? '',
      ssid: current.ssid ?? null,
      senalPct: typeof current.senalPct === 'number' ? current.senalPct : null,
      perfil: current.perfil ?? null,
    });
  };

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const field = fieldFromLine(line);
    if (!field) continue;
    // Clave normalizada SIN no-letras: tolera mojibake de consolas Windows
    // (cp850/cp1252 convierten "Señal" en "Se¤al"/"Se\uFFFDal" → "seal"/"seal").
    const key = stripDiacritics(field.key).replace(/[^a-z]/g, '');
    const { value } = field;
    if (!key || !value) continue;

    // Nueva interfaz (los demás campos nunca colisionan con nombre/name exacto).
    if (key === 'nombre' || key === 'name') {
      flush();
      current = { nombre: value };
      continue;
    }
    if (!current) continue;

    switch (key) {
      case 'descripcion':
      case 'description':
        current.descripcion = value;
        break;
      case 'estado':
      case 'state':
        current.estadoCrudo = value;
        current.estado = normalizeEstado(value);
        break;
      case 'ssid':
        current.ssid = value.length > 0 ? value : null;
        break;
      case 'senal': // "Señal" tras stripDiacritics
      case 'seal': // "Señal" con mojibake cp850/cp1252 (regresión consola Windows)
      case 'signal':
        current.senalPct = Number.parseInt(value.replace(/[^\d]/g, ''), 10);
        if (!Number.isFinite(current.senalPct)) current.senalPct = null;
        break;
      case 'perfil':
      case 'profile':
        // En show interfaces la línea es "Perfil : X"; en show profiles aparece
        // "Perfil de todos los usuarios : X" (no matchea porque exige ':' inmediato).
        current.perfil = value;
        break;
      default:
        break;
    }
  }
  flush();
  return out;
}

/** Resumen operativo del primer adaptador WLAN (null = no hay interfaz WiFi). */
export function wifiSummary(ifaces: WlanInterface[]): {
  presente: boolean;
  connected: boolean;
  ssid: string | null;
  senalPct: number | null;
  perfil: string | null;
} | null {
  const first = ifaces[0];
  if (!first) return null;
  return {
    presente: true,
    connected: first.estado === 'connected',
    ssid: first.ssid,
    senalPct: first.senalPct,
    perfil: first.perfil,
  };
}

/**
 * Parsea la salida de `netsh wlan show profiles` (ES o EN):
 * líneas "Perfil de todos los usuarios : X" / "All User Profile : X".
 */
export function parseWlanProfiles(raw: string): string[] {
  const out: string[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    // Regex case-insensitive sobre la línea ORIGINAL para preservar la caja
    // del nombre (SSID/perfiles son case-sensitive).
    const m = rawLine.trim().match(
      /^(?:perfil de todos los usuarios|all user profile)\s*:\s*(.+)$/i,
    );
    if (m && m[1].trim().length > 0) out.push(m[1].trim());
  }
  return out;
}

/** Parsea la salida de `ping -n 1 host` (ES o EN). */
export function parsePingOutput(raw: string): { ok: boolean; razon: 'pong' | 'timeout' | 'unreachable' | 'no_reply' } {
  if (/\bttl[=<]/i.test(raw)) return { ok: true, razon: 'pong' };
  const v = stripDiacritics(raw);
  if (/tiempo de espera agotado|request timed out/.test(v)) return { ok: false, razon: 'timeout' };
  if (/inalcanzable|unreachable/.test(v)) return { ok: false, razon: 'unreachable' };
  return { ok: false, razon: 'no_reply' };
}

/* Decisión (política determinista + auditoría) ----------------------------- */

export type NetAction = 'noop' | 'reconnect' | 'scan' | 'report_only';

export interface NetWatchDecision {
  accion: NetAction;
  /** Razón auditable en es (va al NDJSON tal cual). */
  razon: string;
  /** argv a ejecutar cuando la acción muta o consulta. */
  argv?: string[];
  /** true si la acción cambia el estado del sistema (consume rate-limit). */
  muta: boolean;
}

export interface NetWatchTickInput {
  /** Resumen del adaptador; null = sin interfaz WiFi (ethernet/desktop). */
  summary: ReturnType<typeof wifiSummary>;
  /** Resultado de las sondas ping (true = internet OK). */
  probeOk: boolean;
  /** Acciones mutantes registradas en la última hora. */
  accionesRecientes: number;
  /** Segundos desde la última acción mutante; null = nunca. */
  ultimaAccionHaceSeg: number | null;
  config: ResolvedNetWatchConfig;
}

/** Decide la acción del tick. Determinista: mismo input → misma decisión. */
export function decideNetAction(input: NetWatchTickInput): NetWatchDecision {
  const { summary, probeOk, accionesRecientes, ultimaAccionHaceSeg, config } = input;

  if (!summary || !summary.presente) {
    return { accion: 'report_only', razon: 'sin_interfaz_wifi', muta: false };
  }

  const online = summary.connected && probeOk;
  if (online) {
    return { accion: 'noop', razon: 'conectado_y_probe_ok', muta: false };
  }

  // A partir de aquí hay un problema real → toda acción muta pasa por rate-limit.
  const enfriando =
    ultimaAccionHaceSeg !== null && ultimaAccionHaceSeg < config.enfriamientoSeg;
  if (enfriando) {
    return {
      accion: 'report_only',
      razon: `enfriamiento_${config.enfriamientoSeg}s_faltan_${
        config.enfriamientoSeg - (ultimaAccionHaceSeg as number)
      }s`,
      muta: false,
    };
  }
  if (accionesRecientes >= config.maxAccionesPorHora) {
    return {
      accion: 'report_only',
      razon: `tope_horario_${accionesRecientes}/${config.maxAccionesPorHora}`,
      muta: false,
    };
  }

  const objetivo = config.perfilPreferido ?? summary.perfil ?? summary.ssid ?? null;

  if (summary.connected && !probeOk) {
    // Conectado a la AP pero sin internet: reconectar suele renovar DHCP/portal.
    if (config.autoConnect && objetivo) {
      return {
        accion: 'reconnect',
        razon: `conectado_sin_internet_reconnect_${objetivo}`,
        argv: netshConnectArgv(objetivo),
        muta: true,
      };
    }
    return { accion: 'scan', razon: 'conectado_sin_internet_autoconnect_off', muta: false };
  }

  if (!summary.connected) {
    if (config.autoConnect && objetivo) {
      return {
        accion: 'reconnect',
        razon: `desconectado_reconnect_${objetivo}`,
        argv: netshConnectArgv(objetivo),
        muta: true,
      };
    }
    return {
      accion: 'scan',
      razon: 'desconectado_sin_perfil_conocido',
      argv: netshNetworksArgv(),
      muta: false,
    };
  }

  return { accion: 'noop', razon: 'sin_cambio', muta: false };
}

/* argv builders (el runner los ejecuta; tests los comparan literal) -------- */

export function netshStatusArgv(): string[] {
  return ['netsh', 'wlan', 'show', 'interfaces'];
}

export function netshProfilesArgv(): string[] {
  return ['netsh', 'wlan', 'show', 'profiles'];
}

export function netshConnectArgv(perfil: string, interfaz?: string): string[] {
  return [
    'netsh',
    'wlan',
    'connect',
    `name=${perfil}`,
    ...(interfaz ? [`interface=${interfaz}`] : []),
  ];
}

export function netshDisconnectArgv(interfaz?: string): string[] {
  return ['netsh', 'wlan', 'disconnect', ...(interfaz ? [`interface=${interfaz}`] : [])];
}

export function netshNetworksArgv(): string[] {
  return ['netsh', 'wlan', 'show', 'networks'];
}

/** Sonda ping cross-platform (win32: -n/-w ms; unix: -c/-W s). */
export function pingProbeArgv(host: string, platform: NodeJS.Platform = process.platform): string[] {
  return platform === 'win32'
    ? ['ping', '-n', '1', '-w', '3000', host]
    : ['ping', '-c', '1', '-W', '3', host];
}

/** Ejecuta las sondas en orden hasta la primera OK (lógica pura: recibe resultados). */
export function probeSequence(
  results: Array<{ host: string; ok: boolean }>,
): { ok: boolean; hostQueRespondio: string | null } {
  for (const r of results) {
    if (r.ok) return { ok: true, hostQueRespondio: r.host };
  }
  return { ok: false, hostQueRespondio: null };
}

/* Auditoría (NDJSON append-only) ------------------------------------------- */

export interface NetAuditEntry {
  ts: string; // ISO determinista provisto por el runner/reloj
  decision: NetAction;
  razon: string;
  ssid: string | null;
  senalPct: number | null;
  probeOk: boolean;
  argvEjecutado?: string[] | null;
  resultado?: 'ok' | 'fallo' | null;
}

/** Serializa una entrada de auditoría como línea NDJSON determinista
 * (claves ordenadas alfabéticamente; sin campos undefined). */
export function auditEntryNdjson(entry: NetAuditEntry): string {
  const clean: Record<string, unknown> = {
    argvEjecutado: entry.argvEjecutado ?? null,
    decision: entry.decision,
    probeOk: entry.probeOk,
    razon: entry.razon,
    resultado: entry.resultado ?? null,
    senalPct: entry.senalPct,
    ssid: entry.ssid,
    ts: entry.ts,
  };
  return JSON.stringify(clean);
}

/* Programación (schtasks / cron) -------------------------------------------- */

export interface NetWatchScheduleOptions {
  taskName: string;
  cadaNMinutos: number;
  workdir: string;
}

/** argv schtasks Windows apuntando al runner netwatch (--once). */
export function netwatchSchtasksArgv(opts: NetWatchScheduleOptions): { cmd: string; args: string[] } {
  const triga = `/SC MINUTE /MO ${Math.max(5, opts.cadaNMinutos)}`;
  return {
    cmd: 'schtasks',
    args: [
      '/Create',
      '/F',
      '/TN', opts.taskName,
      ...triga.split(' ').filter(Boolean),
      '/TR', `"cd /d ${opts.workdir} && node_modules\\.bin\\vite-node.cmd Task\\netwatch-run.ts --once"`,
    ],
  };
}

/** Línea cron Linux/macOS cada N minutos (N debe dividir 60; se ajusta al
 * divisor válido más cercano hacia abajo para semántica cron correcta). */
export function netwatchCronLine(opts: NetWatchScheduleOptions): string {
  const n = Math.max(5, opts.cadaNMinutos);
  const divisores = [5, 10, 15, 20, 30, 60];
  const paso = divisores.find((d) => d >= n && 60 % d === 0) ?? 60;
  const expr = paso === 60 ? '0 * * * *' : `*/${paso} * * * *`;
  return `${expr} cd ${opts.workdir} && node_modules/.bin/vite-node Task/netwatch-run.ts --once`;
}
