/**
 * Catálogo declarativo del apartado "Open Source Lab" del Studio (loop-104).
 *
 * QUÉ ES: la única fuente de verdad sobre los proyectos open source vendoreados
 * en `vendor/` y su relación con el producto: qué aportan, en qué estado está
 * su integración y qué acciones concretas habilitan en el Studio.
 *
 * POR QUÉ archivo separado: es dato PURO sin imports (ni zod ni node:*), así
 * `apps/web` puede recibirlo como prop desde un server component sin arrastrar
 * el bundle de Node al cliente (el resto de studio.ts usa Buffer/WAV).
 *
 * Estado de integración:
 * - ported   → los principios ya viven como capability propia (@ultraia/core).
 * - wired    → portado Y expuesto en UI o tool del runtime.
 * - available→ vendoreado y analizado; integración pendiente (acción definida).
 */

export type OssStatus = 'ported' | 'wired' | 'available';

export interface OssEntry {
  id: string;
  name: string;
  /** Ruta relativa al checkout dentro de `vendor/`. */
  vendorPath: string;
  license: string;
  status: OssStatus;
  /** Qué aporta al producto (lenguaje usuario, sin marketing). */
  aporta: string;
  /** Acciones concretas que habilita (o habilitará) en el Studio. */
  acciones: string[];
}

export const OSS_STATUS_LABEL: Record<OssStatus, string> = {
  ported: 'Portado',
  wired: 'Integrado',
  available: 'Disponible',
};

export const OSS_CATALOG: readonly OssEntry[] = [
  {
    id: 'video-use',
    name: 'video-use',
    vendorPath: 'vendor/video-use',
    license: 'MIT',
    status: 'ported',
    aporta:
      'Edición de vídeo conversacional: EDL lossless por segmentos, cortes seguros verificados, subtítulos al final y self-eval antes de entregar.',
    acciones: ['Editar vídeo guardado (flujo EDL)', 'Render ffmpeg determinista', 'Self-eval de cortes'],
  },
  {
    id: 'codevfx',
    name: 'Elemental Sandbox (LinearAbiltyCastingThreeJS)',
    vendorPath: 'vendor/LinearAbiltyCastingThreeJS',
    license: 'MIT',
    status: 'ported',
    aporta:
      'Efectos VFX 100% código (GLSL hand-written, sin texturas ni sprites): fire, ice, lightning, meteor, beam y más, con fases windup/travel/impact/fade.',
    acciones: ['Generar efecto VFX', 'Guardar efecto como asset reproducible'],
  },
  {
    id: 'g0dm0d3',
    name: 'G0DM0D3',
    vendorPath: 'vendor/G0DM0D3',
    license: 'AGPL-3.0',
    status: 'ported',
    aporta:
      'Parseltongue (33 técnicas de reformulación), AutoTune de sampling por contexto y carreras multi-pass para exprimir el modelo configurado.',
    acciones: ['Tools g0_parseltongue / g0_autotune / g0_ultraplinian / g0_godmode'],
  },
  {
    id: 'webharvest',
    name: 'WebHarvest',
    vendorPath: 'vendor/webharvest',
    license: 'MIT',
    status: 'wired',
    aporta:
      'Scraping 100% local de cualquier página a markdown/HTML/JSON estructurado, alternativa libre a servicios de crawling en la nube.',
    acciones: ['WebPanel: motor Local (webharvest scrape) con fallback automático'],
  },
  {
    id: 'mcp-search',
    name: 'MCPSearch',
    vendorPath: 'vendor/mcp-search',
    license: 'MIT',
    status: 'available',
    aporta:
      'Plataforma de investigación multi-fuente autoalojada compatible con MCP: busca, rastrea y estructura resultados para agentes.',
    acciones: ['Fuente adicional para research_search y briefs de AutoPub'],
  },
  {
    id: 'firecrawl-agent',
    name: 'Firecrawl Web Agent',
    vendorPath: 'vendor/firecrawl-web-agent',
    license: 'MIT',
    status: 'available',
    aporta:
      'Agente autónomo de investigación web con skills intercambiables; base abierta del agente de firecrawl.dev.',
    acciones: ['Deep-crawl opcional del WebPanel con FIRECRAWL_API_KEY (free tier)'],
  },
  {
    id: 'openbrowser',
    name: 'Open Browser',
    vendorPath: 'vendor/openbrowser',
    license: 'MIT',
    status: 'available',
    aporta:
      'Framework TypeScript de navegación autónoma con IA: planifica, clica y extrae estado real del navegador.',
    acciones: ['Captura real de pantallas web como asset del Studio'],
  },
  {
    id: 'ecc',
    name: 'Everything Claude Code',
    vendorPath: 'vendor/everything-claude-code',
    license: 'MIT',
    status: 'available',
    aporta:
      'Sistema operativo de harness de agentes: patrones de skills, hooks y comandos reutilizables.',
    acciones: ['Skills bp-* para operar el media hub por chat'],
  },
];

/** Guardas de integridad del catálogo (testeado en studio.test.ts). */
export function validateCatalog(entries: readonly OssEntry[] = OSS_CATALOG): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const validStatus: OssStatus[] = ['ported', 'wired', 'available'];
  for (const e of entries) {
    if (!e.id || ids.has(e.id)) errors.push(`id duplicado o vacío: ${e.id}`);
    ids.add(e.id);
    if (!validStatus.includes(e.status)) errors.push(`status inválido en ${e.id}: ${e.status}`);
    if (!e.license) errors.push(`sin licencia: ${e.id}`);
    if (!e.vendorPath.startsWith('vendor/')) errors.push(`vendorPath inválido en ${e.id}: ${e.vendorPath}`);
    if (!e.aporta) errors.push(`sin descripción: ${e.id}`);
    if (!Array.isArray(e.acciones) || e.acciones.length === 0) errors.push(`sin acciones: ${e.id}`);
  }
  return errors;
}

export const studioCatalog = { OSS_CATALOG, OSS_STATUS_LABEL, validateCatalog };
