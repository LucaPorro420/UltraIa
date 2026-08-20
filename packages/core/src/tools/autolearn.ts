//! Capability `autolearn` — Agente de autoaprendizaje de UltraIa.
// *
// * Dominio puro determinista (0 deps, keyless, sin red): sensa el estado de
// * aprendizaje del proyecto (lecciones + verdad verificada + backlog + fuentes),
// * detecta gaps, prioriza mejoras (RICE simplificado) y genera el plan de
// * mejora (autoprogramado: el agente escribe su propio plan con patrón loop-piv).
// *
// * Núcleo del pedido del usuario (20/08/2026): "agente de autoaprendizaje que
// * automatice el autoprogramado, buscar nueva información y mejorar".
// *
// * Attribution: patrón inspirado en el ciclo de meta-aprendizaje del diseño
// * externo SACD/NASA (learning/sources/sacd-nasa.md) — implementación ORIGINAL.
// * Fuente del diseño del agente: learning/sources/autolearn.md.

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

/** Una lección aprendida parseada de LEARNINGS.md. */
export interface LearningEntry {
  /** Fecha ISO si está presente ('2026-08-20'), o '' si no. */
  fecha: string;
  /** Ciclo/número de iteración si está presente ('68', '69'), o '' si no. */
  ciclo: string;
  /** Texto completo de la lección (sin prefijos de formato). */
  texto: string;
}

/** Estadísticas de la verdad verificada (learning/truth/*.json). */
export interface TruthStats {
  total: number;
  fuentes: string[];
  tipos: Record<string, number>;
}

/** Tipo de gap detectado por el agente. */
export type GapKind =
  | 'tema_sin_truth' // un tema recurrente sin verdad verificada
  | 'leccion_sin_implementar' // una lección sin capability/tool que la aplique
  | 'source_sin_analizar' // una fuente descargada sin RAZONAMIENTO
  | 'backlog_pendiente'; // una tarea del backlog en estado pendiente

/** Un gap detectado por el agente de autoaprendizaje. */
export interface Gap {
  kind: GapKind;
  descripcion: string;
  evidencia: string;
}

/** Ítem priorizado con score RICE simplificado. */
export interface PrioritizedItem {
  id: string;
  descripcion: string;
  /** impact × confidence / effort — mayor es mejor. */
  score: number;
  impact: number;
  effort: number;
  confidence: number;
}

/** Plan de mejora generado por el agente (patrón loop-piv). */
export interface LearnPlan {
  objetivo: string;
  fecha: string;
  pasos: string[];
  archivos: string[];
  criterios: string[];
  prioridad: string;
  gaps: Gap[];
}

/** KPIs del ciclo de autoaprendizaje. */
export interface LearningMetrics {
  leccionesTotales: number;
  leccionesUltimoPeriodo: number;
  truthVerificada: number;
  gapsAbiertos: number;
  fuentesAnalizadas: number;
  tasaMejora: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser de lecciones (LEARNINGS.md)
// ─────────────────────────────────────────────────────────────────────────────

const CICLO_RE = /ciclo\s*(\d+)/i;
/** ISO (2026-08-20) o dd/mm/yyyy (20/08/2026). */
const FECHA_ISO_RE = /(\d{4})-(\d{2})-(\d{2})/;
const FECHA_DMY_RE = /(\d{2})\/(\d{2})\/(\d{4})/;

function parseFecha(body: string): string {
  const iso = body.match(FECHA_ISO_RE);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = body.match(FECHA_DMY_RE);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return '';
}

/**
 * Parsea el texto de LEARNINGS.md en entradas de aprendizaje.
 * Formato soportado (líneas bullet):
 *   "- **Título** (fecha, ciclo N): lección larga..."
 *   "- lección sin metadatos"
 */
export function parseLearnings(text: string): LearningEntry[] {
  const entries: LearningEntry[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('-') && !line.startsWith('*')) continue;
    const body = line.replace(/^[-*]\s+/, '').trim();
    if (!body) continue;

    const fechaMatch = parseFecha(body);
    const cicloMatch = body.match(CICLO_RE);
    // Conserva el título bold (sin asteriscos) como parte del texto: el tema
    // de la lección vive en el título y lo usan detectGaps/prioritize.
    const texto = body
      .replace(/\*\*/g, '')
      .replace(FECHA_ISO_RE, '')
      .replace(FECHA_DMY_RE, '')
      .replace(CICLO_RE, '')
      .replace(/[()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    entries.push({
      fecha: fechaMatch,
      ciclo: cicloMatch ? cicloMatch[1] : '',
      texto: texto || body,
    });
  }
  return entries;
}

/** Cuenta cuántas lecciones cayeron en el periodo reciente (últimos N días). */
export function countRecentLearnings(entries: LearningEntry[], days = 7): number {
  const cutoff = Date.now() - days * 86_400_000;
  return entries.filter((e) => {
    if (!e.fecha) return false;
    const t = new Date(e.fecha + 'T00:00:00Z').getTime();
    return !Number.isNaN(t) && t >= cutoff;
  }).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Estadísticas de la verdad verificada
// ─────────────────────────────────────────────────────────────────────────────

/** Estadísticas de la verdad verificada (reusa corpusStats si está disponible). */
export function scanTruthStats(docs: Array<{ fuente?: string; tipo?: string }>): TruthStats {
  const fuentes = [...new Set(docs.map((d) => d.fuente ?? 'sin_fuente'))].sort();
  const tipos: Record<string, number> = {};
  for (const d of docs) {
    const t = d.tipo || 'sin_tipo';
    tipos[t] = (tipos[t] ?? 0) + 1;
  }
  return { total: docs.length, fuentes, tipos };
}

// ─────────────────────────────────────────────────────────────────────────────
// Detección de gaps
// ─────────────────────────────────────────────────────────────────────────────

export interface GapInputs {
  /** Texto de LEARNINGS.md (o entradas ya parseadas). */
  learnings: string | LearningEntry[];
  /** Documentos de verdad (con fuente/tipo), p.ej. de loadTruthCorpus. */
  truth: Array<{ fuente?: string; tipo?: string; texto?: string }>;
  /** Texto del backlog (STATE.md) o lista de líneas con estado. */
  backlog: string | string[];
  /** Nombres de fuentes descargadas en learning/sources. */
  sources: string[];
  /** Nombres de análisis RAZONAMIENTO-*.md en docs/. */
  razonamientos: string[];
  /** Términos clave implementados (capabilities/tools registradas) para cruzar con lecciones. */
  implemented?: string[];
}

/**
 * Detecta gaps del ciclo de autoaprendizaje:
 * - temas sin verdad verificada (términos de lecciones sin cobertura en truth)
 * - lecciones sin implementar (keywords de la lección sin capability correspondiente)
 * - fuentes descargadas sin análisis RAZONAMIENTO
 * - tareas del backlog en estado pendiente
 */
export function detectGaps(inputs: GapInputs): Gap[] {
  const gaps: Gap[] = [];
  const entries = Array.isArray(inputs.learnings) ? inputs.learnings : parseLearnings(inputs.learnings);

  // 1. Fuentes sin analizar.
  const razonSet = new Set(
    inputs.razonamientos.map((r) => r.replace(/^RAZONAMIENTO[-_]/i, '').replace(/\.md$/i, '').toLowerCase()),
  );
  for (const src of inputs.sources) {
    const slug = src.replace(/\.md$/i, '').toLowerCase();
    if (!razonSet.has(slug)) {
      gaps.push({
        kind: 'source_sin_analizar',
        descripcion: `Fuente "${src}" descargada sin análisis RAZONAMIENTO`,
        evidencia: `learning/sources/${src}`,
      });
    }
  }

  // 2. Lecciones sin implementar (cruza keywords de la lección contra implemented).
  const implLower = (inputs.implemented ?? []).map((s) => s.toLowerCase());
  const knownTopics = new Set(['api', 'web', 'search', 'memory', 'sql', 'video', 'audio', 'image', 'code', 'docker']);
  for (const e of entries) {
    const lower = e.texto.toLowerCase();
    if (!inputs.implemented || inputs.implemented.length === 0) continue;
    const topic = [...knownTopics].find((t) => lower.includes(t));
    if (topic && !implLower.some((i) => i.includes(topic))) {
      gaps.push({
        kind: 'leccion_sin_implementar',
        descripcion: `Lección sobre "${topic}" sin capability/tool que la aplique`,
        evidencia: e.texto.slice(0, 120),
      });
    }
  }

  // 3. Temas sin verdad verificada (lecciones con tema que no aparece en truth).
  const truthText = inputs.truth.map((t) => (t.texto ?? '').toLowerCase()).join(' ');
  for (const e of entries) {
    const lower = e.texto.toLowerCase();
    const topic = [...knownTopics].find((t) => lower.includes(t));
    if (topic && !truthText.includes(topic)) {
      gaps.push({
        kind: 'tema_sin_truth',
        descripcion: `Tema "${topic}" aparece en lecciones pero sin caso de verdad verificada`,
        evidencia: `truth: ${inputs.truth.length} docs; topic="${topic}" ausente`,
      });
    }
  }

  // 4. Backlog pendiente.
  const backlogLines = Array.isArray(inputs.backlog) ? inputs.backlog : inputs.backlog.split(/\r?\n/);
  for (const line of backlogLines) {
    const l = line.toLowerCase();
    if (l.includes('pendiente') || l.includes('pending')) {
      gaps.push({
        kind: 'backlog_pendiente',
        descripcion: `Tarea del backlog en estado pendiente`,
        evidencia: line.trim().slice(0, 160),
      });
    }
  }

  // Dedupe por descripcion.
  const seen = new Set<string>();
  return gaps.filter((g) => {
    if (seen.has(g.descripcion)) return false;
    seen.add(g.descripcion);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Priorización (RICE simplificado)
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkCandidate {
  id: string;
  descripcion: string;
  impact: number; // 1-5
  effort: number; // 1-5 (menor = menos esfuerzo)
  confidence: number; // 0-1
}

/**
 * Score RICE simplificado: (impact × confidence) / effort. Mayor es mejor.
 * Determinista: empates por id asc.
 */
export function prioritizeWork(items: WorkCandidate[]): PrioritizedItem[] {
  return items
    .map((i) => ({
      id: i.id,
      descripcion: i.descripcion,
      score: round3((i.impact * i.confidence) / Math.max(1, i.effort)),
      impact: i.impact,
      effort: i.effort,
      confidence: i.confidence,
    }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan de mejora (autoprogramado)
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildPlanInput {
  gaps: Gap[];
  priorities: PrioritizedItem[];
  fecha?: string;
  objetivo?: string;
}

/**
 * Genera el plan de mejora con patrón loop-piv: objetivo, pasos (gaps ordenados
 * por prioridad), archivos a tocar (inferidos de la evidencia), criterios
 * scoped/FULL y prioridad del plan.
 */
export function buildImprovementPlan(input: BuildPlanInput): LearnPlan {
  const fecha = input.fecha ?? new Date().toISOString().slice(0, 10);
  const top = input.priorities.slice(0, 5);
  const pasos = top.map((p, i) => `${i + 1}. ${p.descripcion} (score ${p.score})`);

  const archivos = [
    ...new Set(
      input.gaps
        .map((g) => g.evidencia.split('/').pop() ?? '')
        .filter((f) => f && f.length > 4),
    ),
  ].slice(0, 8);

  return {
    objetivo:
      input.objetivo ??
      `Cerrar ${top.length} gaps de aprendizaje priorizados (${top.map((t) => t.id).join(', ')})`,
    fecha,
    pasos: pasos.length ? pasos : ['1. Sin gaps priorizados: ejecutar el siguiente ciclo del backlog.'],
    archivos,
    criterios: [
      'Scoped: tests de la capability tocada PASS.',
      'FULL: typecheck → lint → test → build, todos verdes.',
      'Commit único con pathspec (nunca `git add .`).',
    ],
    prioridad: top[0] ? `P${Math.max(0, 5 - top[0].impact)}` : 'P5',
    gaps: input.gaps.slice(0, 10),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Métricas del ciclo
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricsInput {
  entries: LearningEntry[];
  truthCount: number;
  gaps: Gap[];
  sourcesCount: number;
  days?: number;
}

/** KPIs del ciclo de autoaprendizaje (deterministas, sin estado). */
export function learningMetrics(input: MetricsInput): LearningMetrics {
  const days = input.days ?? 7;
  const leccionesUltimoPeriodo = countRecentLearnings(input.entries, days);
  const leccionesTotales = input.entries.length;
  const truthVerificada = input.truthCount;
  const gapsAbiertos = input.gaps.length;
  const fuentesAnalizadas = input.sourcesCount;
  const tasaMejora =
    leccionesTotales + truthVerificada + gapsAbiertos === 0
      ? 0
      : round3(
          (leccionesUltimoPeriodo + truthVerificada) /
            Math.max(1, leccionesTotales + truthVerificada),
        );

  return {
    leccionesTotales,
    leccionesUltimoPeriodo,
    truthVerificada,
    gapsAbiertos,
    fuentesAnalizadas,
    tasaMejora,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Namespace de la capability
// ─────────────────────────────────────────────────────────────────────────────

export const autolearn = {
  parseLearnings,
  countRecentLearnings,
  scanTruthStats,
  detectGaps,
  prioritizeWork,
  buildImprovementPlan,
  learningMetrics,
};

// Tipos reexportados para el wiring.
export type { TruthDoc } from './semantic-memory';
export { loadTruthCorpus } from './semantic-memory';