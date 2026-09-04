//! AutoPub — autonomous content pipeline orchestrator.
// F1 (topics) → F2 (content) → F3 (presentation) → F4 (publish queue).
// Coordinates brief generation, content routing, package building, and
// publication queueing. Runs headless via schtasks/cron or cerebro-cycle.
import { z } from 'zod';
import { generateTopicBriefs } from './topics';
import type { TopicBrief, TopicChannel, TopicFormat, TopicTone } from './topics';
import { guardarBriefs, listarBriefs } from '../domain/briefs';
import { marcarBriefProcesado } from '../domain/briefs';
import type { BriefRow } from '../domain/briefs';
import { generarContenido } from './enrutador';
import type { ContentPackage } from './enrutador';
import { present } from './present';
import type { PublicationPackage, PresentChannel } from './present';
import { createPublication, publishDue, canalRequiereAprobacion } from '../domain/publications';
import type { Db } from '../db/client';

/**
 * AutoPub Autonomo (iter-90) — orquestador del ciclo F1→F4 programado.
 *
 * Encadena las piezas existentes de la fabrica de contenido en UN ciclo ejecutable:
 *   F1  topics.generateTopicBriefs      → ideas nuevas
 *       domain/briefs.guardarBriefs     → cola persistente (dedupe tema+canal)
 *   F2  enrutador.generarContenido      → texto | guion | guion_largo (es/ar, TTS opcional)
 *   F3  present.present                 → PublicationPackage (captions/visual/branding por canal)
 *   F4  domain/publications.createPublication → cola con regla HIBRIDA vigente:
 *          texto/blog → APPROVED automatico; video/imagen → DRAFT (aprobacion humana)
 *   CAL publications.publishDue         → publica los APPROVED vencidos (fail-soft sin tokens)
 *
 * Dominio PURO con dependencias inyectables (patron screenflow/replica): `runAutopubCycle`
 * no conoce Prisma ni la red; `defaultAutopubDeps(db)` compone las piezas reales. Fail-soft
 * por fase: un fallo puntual se registra en el reporte y el ciclo continua.
 */

/** Canales objetivo del ciclo (union completa de PresentChannel). */
export const CANALES_AUTOPUB = [
  'youtube_shorts',
  'tiktok',
  'instagram',
  'blog',
  'telegram',
  'discord',
  'slack',
  'facebook',
] as const;

export type AutopubCanal = (typeof CANALES_AUTOPUB)[number];

export interface AutopubConfig {
  maxBriefs: number;
  idioma: 'es' | 'ar';
  canales: AutopubCanal[];
  tts: boolean;
  publishDue: boolean;
}

export const autopubConfigSchema = z.object({
  maxBriefs: z.number().int().min(1).max(10).default(3),
  idioma: z.enum(['es', 'ar']).default('es'),
  canales: z.array(z.enum(CANALES_AUTOPUB)).min(1).default([...CANALES_AUTOPUB]),
  tts: z.boolean().default(false),
  publishDue: z.boolean().default(false),
});

export interface ParseAutopubConfigResult {
  ok: boolean;
  config: AutopubConfig;
  issues: string[];
}

/** Parsea la config del ciclo (fail-soft): entrada invalida → defaults + issues. */
export function parseAutopubConfig(input: unknown): ParseAutopubConfigResult {
  const parsed = autopubConfigSchema.safeParse(input ?? {});
  if (parsed.success) {
    return { ok: true, config: parsed.data, issues: [] };
  }
  const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`);
  const defaults = autopubConfigSchema.parse({});
  return { ok: false, config: defaults, issues };
}

// ---------------------------------------------------------------------------
// Plan determinista del ciclo (para --dry-run y para la tool autopub_run accion plan)
// ---------------------------------------------------------------------------

export interface AutopubPaso {
  fase: 'F1' | 'F2' | 'F3' | 'F4' | 'CAL';
  detalle: string;
}

export interface AutopubPlan {
  generadoEn: string;
  config: AutopubConfig;
  disponibles: number;
  pasos: AutopubPaso[];
}

/** Pasos que ejecutara el ciclo (determinista; sin efectos). */
export function planAutopubCycle(config: AutopubConfig, disponibles: number, clock: () => Date = () => new Date()): AutopubPlan {
  const n = Math.min(disponibles, config.maxBriefs);
  const pasos: AutopubPaso[] = [
    { fase: 'F1', detalle: `descubrir temas y guardar briefs nuevos (dedupe tema+canal)` },
    { fase: 'F2', detalle: `tomar hasta ${config.maxBriefs} briefs NUEVO de la cola (${disponibles} disponibles) → generarContenido idioma=${config.idioma}${config.tts ? '+tts' : ''}` },
    { fase: 'F3', detalle: `present(): paquete con captions/visual/branding para ${config.canales.length} canales (${config.canales.join(', ')})` },
    { fase: 'F4', detalle: `createPublication por brief en su canal (hibrido: texto/blog APPROVED; video/imagen DRAFT) + marcar PROCESADO` },
  ];
  if (config.publishDue) pasos.push({ fase: 'CAL', detalle: 'publishDue(): publica los APPROVED programados ya vencidos' });
  void n;
  return { generadoEn: clock().toISOString(), config, disponibles, pasos };
}

// ---------------------------------------------------------------------------
// Helpers de conversion / extraccion
// ---------------------------------------------------------------------------

/** BriefRow (cola Prisma) → TopicBrief (entrada de generarContenido/present). */
export function rowToBrief(row: BriefRow): TopicBrief {
  return {
    tema: row.tema,
    canal: row.canal as TopicChannel,
    formato: row.formato as TopicFormat,
    tono: row.tono as TopicTone,
    angulo: row.angulo,
    fuentes: row.fuentes,
    score: row.score,
    pubDate: row.pubDate,
  };
}

/** Extrae el texto plano de un ContentPackage segun su tipo (determinista). */
export function textoDeContenido(cp: ContentPackage): string {
  if (cp.contenido) {
    const c = cp.contenido;
    return [c.titulo, c.intro, c.cuerpo.join('\n\n'), c.cierre, c.cta].filter(Boolean).join('\n\n');
  }
  if (cp.guion) return cp.guion.narracion;
  if (cp.timeline) {
    const dialogos = (cp.timeline.tracks.dialogue ?? []).map((d) => d.text).filter(Boolean);
    if (dialogos.length) return dialogos.join('\n\n');
  }
  return cp.brief?.tema ?? '';
}

// ---------------------------------------------------------------------------
// Ciclo ejecutable con dependencias inyectables
// ---------------------------------------------------------------------------

export interface GenerarPaqueteResult {
  paquete: PublicationPackage;
  /** Paquete intermedio F2 (tipo/manifest) — solo informativo para el reporte. */
  contentPackage?: ContentPackage;
}

export interface AutopubDeps {
  /** F1: descubrir ideas nuevas (red: RSS + DDG). Omitir/fallar → el ciclo usa la cola existente. */
  descubrirTemas?: () => Promise<TopicBrief[]>;
  /** F1: persistir briefs con dedupe. */
  guardar?: (briefs: TopicBrief[]) => Promise<{ creados: number; yaExistentes: number }>;
  /** Cola: top-N briefs estado NUEVO ordenados por score desc. */
  listarCola: (take: number) => Promise<BriefRow[]>;
  /** F2+F3: 1 brief → paquete de publicacion completo. */
  generarPaquete: (row: BriefRow, config: AutopubConfig) => Promise<GenerarPaqueteResult>;
  /** F4: encolar el paquete en un canal (regla hibrida dentro del dominio). */
  encolar: (input: { paquete: PublicationPackage; canal: PresentChannel }) => Promise<{ id: string; estado: string; requiereAprobacion: boolean }>;
  /** Marca el brief como PROCESADO tras encolar (fallo tolerable). */
  marcarProcesado?: (id: string) => Promise<unknown>;
  /** CAL: publica los APPROVED vencidos. */
  publicarVencidos?: () => Promise<{ publicadas: number; fallidas: number }>;
  /** Reloj inyectable (tests deterministas). */
  clock?: () => Date;
}

export interface AutopubItemResultado {
  briefId: string;
  publicationId: string;
  tema: string;
  canal: string;
  tipo: string;
  estado: string;
  requiereAprobacion: boolean;
}

export interface AutopubCycleReport {
  fechaIso: string;
  config: AutopubConfig;
  temasDescubiertos: number;
  briefsCreados: number;
  duplicados: number;
  procesados: AutopubItemResultado[];
  /** null cuando publishDue=false o el paso no corrio. */
  publicadas: number | null;
  fallidas: number | null;
  errores: string[];
  ok: boolean;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Track autopub cycle event with the unified orchestrator. */
export function trackAutopubEvent(event: {
  phase: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}): void {
  try {
    // Dynamic import to avoid circular deps
    const { getOrchestrator } = require('./orchestrator-unified');
    const orchestrator = getOrchestrator();
    orchestrator.trackLearning({
      id: `autopub-${Date.now()}`,
      app: 'runtime',
      timestamp: Date.now(),
      category: 'improvement',
      description: `[AutoPub ${event.phase}] ${event.description}`,
      source: 'autopub.ts',
      impact: event.impact,
      verified: false,
    });
  } catch {
    // Fail-soft: orchestrator not available
  }
}

/** Ejecuta el ciclo completo (fail-soft por fase y por brief). Nunca lanza. */
export async function runAutopubCycle(deps: AutopubDeps, config: AutopubConfig): Promise<AutopubCycleReport> {
  const clock = deps.clock ?? (() => new Date());
  const errores: string[] = [];
  let temasDescubiertos = 0;
  let briefsCreados = 0;
  let duplicados = 0;

  // F1: ideas → cola
  if (deps.descubrirTemas && deps.guardar) {
    try {
      const briefs = await deps.descubrirTemas();
      temasDescubiertos = briefs.length;
      const g = await deps.guardar(briefs);
      briefsCreados = g.creados;
      duplicados = g.yaExistentes;
      trackAutopubEvent({ phase: 'F1', description: `Discovered ${temasDescubiertos} topics, created ${briefsCreados} briefs`, impact: 'medium' });
    } catch (e) {
      errores.push(`F1: ${msg(e)}`);
      trackAutopubEvent({ phase: 'F1', description: `Error: ${msg(e)}`, impact: 'high' });
    }
  }

  // Cola: tomar los N mejores NUEVO
  let rows: BriefRow[] = [];
  if (deps.listarCola) {
    try {
      rows = await deps.listarCola(config.maxBriefs);
    } catch (e) {
      errores.push(`cola: ${msg(e)}`);
    }
  }

  // F2+F3+F4 por brief
  const procesados: AutopubItemResultado[] = [];
  for (const row of rows) {
    try {
      const { paquete, contentPackage } = await deps.generarPaquete(row, config);
      const canal = (config.canales.includes(row.canal as AutopubCanal) ? row.canal : config.canales[0]) as PresentChannel;
      const enc = await deps.encolar({ paquete, canal });
      if (deps.marcarProcesado) {
        try {
          await deps.marcarProcesado(row.id);
        } catch (e) {
          errores.push(`marca ${row.id}: ${msg(e)}`);
        }
      }
      procesados.push({
        briefId: paquete.briefId ?? '',
        publicationId: enc.id,
        tema: row.tema,
        canal,
        tipo: contentPackage?.tipo ?? 'texto',
        estado: enc.estado,
        requiereAprobacion: enc.requiereAprobacion,
      });
    } catch (e) {
      errores.push(`brief ${row.id}: ${msg(e)}`);
    }
  }

  // CAL: publicar vencidos
  let publicadas: number | null = null;
  let fallidas: number | null = null;
  if (config.publishDue && deps.publicarVencidos) {
    try {
      const r = await deps.publicarVencidos();
      publicadas = r.publicadas;
      fallidas = r.fallidas;
    } catch (e) {
      errores.push(`publishDue: ${msg(e)}`);
    }
  }

  return {
    fechaIso: clock().toISOString(),
    config,
    temasDescubiertos: temasDescubiertos,
    briefsCreados: briefsCreados,
    duplicados: duplicados,
    procesados: procesados,
    publicadas: publicadas,
    fallidas: fallidas,
    errores: errores,
    ok: errores.length === 0,
  };
}

/** Resumen Markdown del reporte (para bitacora/heartbeat/notificaciones). */
export function resumenAutopub(report: AutopubCycleReport): string {
  const lineas: string[] = [
    `# AutoPub ciclo ${report.fechaIso}`,
    '',
    `- Estado: ${report.ok ? 'OK' : 'CON ERRORES'} · briefs nuevos ${report.briefsCreados} (dup ${report.duplicados}, descubiertos ${report.temasDescubiertos})`,
    `- Procesados: ${report.procesados.length} · APPROVED auto: ${report.procesados.filter((p) => !p.requiereAprobacion).length} · DRAFT humano: ${report.procesados.filter((p) => p.requiereAprobacion).length}`,
  ];
  if (report.publicadas !== null) lineas.push(`- Publicados ahora: ${report.publicadas ?? 0} · fallidos: ${report.fallidas ?? 0}`);
  if (report.procesados.length) {
    lineas.push('', '| tema | canal | tipo | estado |', '|---|---|---|---|');
    for (const p of report.procesados) {
      lineas.push(`| ${p.tema.slice(0, 60)} | ${p.canal} | ${p.tipo} | ${p.estado} |`);
    }
  }
  if (report.errores.length) {
    lineas.push('', '## Errores', '');
    for (const e of report.errores) lineas.push(`- ${e}`);
  }
  return lineas.join('\n');
}

// ---------------------------------------------------------------------------
// Deps reales (Prisma + herramientas core). La unica parte con efectos.
// ---------------------------------------------------------------------------

export interface DefaultDepsOptions {
  /** Dry-run: no escribe cola, no marca, no publica; genera sin tocar disco. */
  dryRun?: boolean;
  /** Directorio base para manifests/audio de generarContenido (default .ultraia/content). */
  dir?: string;
}

/** Compone las dependencias reales sobre Prisma (`Db`). */
export function defaultAutopubDeps(db: Db, opts: DefaultDepsOptions = {}): AutopubDeps {
  const dry = Boolean(opts.dryRun);
  return {
    descubrirTemas: () =>
      generateTopicBriefs({
        maxBriefs: 12,
        canales: [...CANALES_AUTOPUB],
      }).then((r) => r.briefs),
    guardar: (briefs) => (dry ? Promise.resolve({ creados: 0, yaExistentes: 0 }) : guardarBriefs(db, briefs)),
    listarCola: (take) => listarBriefs(db, { estado: 'NUEVO', take }).then((r) => r.items),
    generarPaquete: async (row, config) => {
      const brief = rowToBrief(row);
      const gen = await generarContenido(brief, {
        dir: opts.dir,
        idioma: config.idioma,
        tts: config.tts,
        dryRun: dry,
      });
      const paquete = present({
        tema: gen.paquete.brief.tema,
        contenido: textoDeContenido(gen.paquete),
        canales: config.canales,
        briefId: gen.paquete.briefId,
      });
      return { paquete, contentPackage: gen.paquete };
    },
    encolar: ({ paquete, canal }) => {
      if (dry) {
        return Promise.resolve({
          id: `dry-${(paquete.briefId ?? 'sin-id').slice(-8)}-${canal}`,
          estado: 'DRY',
          requiereAprobacion: canalRequiereAprobacion(canal),
        });
      }
      return createPublication(db, { paquete, canal }).then((r) => ({
        id: r.id,
        estado: r.estado,
        requiereAprobacion: r.requiereAprobacion,
      }));
    },
    marcarProcesado: (id) => (dry ? Promise.resolve(null) : marcarBriefProcesado(db, id)),
    publicarVencidos: () => (dry ? Promise.resolve({ publicadas: 0, fallidas: 0 }) : publishDue(db)),
    clock: () => new Date(),
  };
}
