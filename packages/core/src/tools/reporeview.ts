/**
 * Capability `reporeview` (iter-107) — Agente revisor de repositorios con
 * documentación en nube (patrón de dominio puro del repo: determinista, keyless,
 * sin I/O en el núcleo más allá del plan de selección).
 *
 * Qué hace:
 *  1. PLAN: selecciona objetivos revisables de un árbol (vendor/, learning/sources/,
 *     docs/, paquetes src) con presupuestos (maxFiles / maxBytes) y skip-list fija.
 *  2. ANALIZA cada archivo en 6 dimensiones de aprendizaje: razonamiento, logica,
 *     matematicas, implementaciones, tecnologias, codigo — con evidencias textuales
 *     (extractos ≤180 chars) y detección de tecnologías por léxico canónico.
 *  3. TRUTH: convierte los hallazgos a TruthDoc ({id,texto,respuesta,tipo,fuente})
 *     compatibles con semantic-memory y con la sincronización Qdrant existente
 *     (memoria_experiencial_v2) — la "nube documental" local o de servidor.
 *  4. MANIFEST + REPORT deterministas (sin timestamps dentro del artefacto).
 *
 * El runner (scripts/reporeview-run.ts) hace el I/O real y el --sync fusionando
 * el corpus COMPLETO de learning/truth/*.json antes de sincronizar (nunca sincro-
 * niza un lote suelto: planMemorySync borra ids remotos ausentes del corpus).
 */

import { createHash } from 'node:crypto';
import { readdirSync, statSync, type Dirent } from 'node:fs';
import type { TruthDoc } from './semantic-memory';

/* ── Dimensiones y señales ─────────────────────────────────────────────── */

export const REVIEW_DIMENSIONS = [
  'razonamiento',
  'logica',
  'matematicas',
  'implementaciones',
  'tecnologias',
  'codigo',
] as const;
export type ReviewDimension = (typeof REVIEW_DIMENSIONS)[number];

interface DimensionSpec {
  /** Umbral de coincidencias para score 1.0 (score = min(1, matches/umbral)). */
  umbral: number;
  patterns: RegExp[];
}

const DIMENSION_SPECS: Record<ReviewDimension, DimensionSpec> = {
  razonamiento: {
    umbral: 4,
    patterns: [
      /\b(porque|por lo tanto|ya que|debido a|trade-?off|decisi[oó]n|raz[oó]n|conclusi[oó]n|implica)\b/i,
      /\b(why|because|therefore|rationale|hypothesis)\b/i,
      /\b(causa|efecto|consecuencia|justifica|motivo)\b/i,
    ],
  },
  logica: {
    umbral: 4,
    patterns: [
      /\b(si .{1,40} entonces|invariante|guarda|precondici[oó]n|postcondici[oó]n)\b/i,
      /\b(if .{1,40} then|invariant|assert|precondition)\b/i,
      /\b(regla|reglas|pol[ií]tica|criterio|condici[oó]n necesaria)\b/i,
    ],
  },
  matematicas: {
    umbral: 3,
    patterns: [
      /[∑∫≈±×÷√∞∂]/,
      /\b(f[oó]rmula|derivada|integral|vector|matriz|coseno|euclidiana|normalizar|embedding dim)\b/i,
      /\b(psnr|ssim|mae|mse|e_?total|score\s*=\s*|peso|ponderad|sigmoide|rice|logaritmo)\b/i,
      /\b\d+(\.\d+)?\s*(=|\*|\+)\s*\d/,
    ],
  },
  implementaciones: {
    umbral: 4,
    patterns: [
      /^\s*(export\s+)?(async\s+)?function\s+\w+/m,
      /^\s*(export\s+)?(class|interface|type)\s+\w+/m,
      /^\s*def\s+\w+/m,
      /\b(argv|pipeline|runner|adapter|wiring|codegen|build[A-Z]\w+)\b/,
    ],
  },
  tecnologias: {
    umbral: 2,
    patterns: [],
  }, // tecnologías usa el léxico canónico, no regex genéricas
  codigo: {
    umbral: 6,
    patterns: [
      /^.{0,4}(import|from)\s+.+$/m,
      /^\s*(const|let|var)\s+\w+\s*=/m,
      /^\s*(describe|it|test)\(/m,
      /^\s*(return|await|throw)\b/m,
    ],
  },
};

/** Léxico canónico de tecnologías (patrón → nombre normalizado). */
export const TECH_LEXICON: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bffmpeg\b/i, 'ffmpeg'],
  [/\bqdrant\b/i, 'qdrant'],
  [/\bneo4j\b/i, 'neo4j'],
  [/\breact\b/i, 'react'],
  [/next\.(js|org)\b/i, 'nextjs'],
  [/\bprisma\b/i, 'prisma'],
  [/\btailwind\b/i, 'tailwind'],
  [/\bvitest\b/i, 'vitest'],
  [/\btypescript\b|\btsconfig\b/i, 'typescript'],
  [/\bdocker(compose)?\b/i, 'docker'],
  [/\bedge-?tts\b/i, 'edge-tts'],
  [/\bpollinations\b/i, 'pollinations'],
  [/\bzod\b/i, 'zod'],
  [/\bgit\s?(hub|lab)?\b|\bgit@/i, 'git'],
  [/\bwebsocket(s)?\b/i, 'websocket'],
  [/\bgl(t[fF])\b|\bmesh(es)?\b|\bobj\b/i, '3d-mesh'],
  [/\baes-?256-?gcm\b/i, 'aes-gcm'],
  [/\bschtask(s)?\b/i, 'schtasks'],
];

/* ── Selección de objetivos (PLAN) ─────────────────────────────────────── */

const REVIEWABLE_EXT = new Set(['.md', '.ts', '.tsx', '.py', '.json', '.txt']);
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.ultraia',
  'resultTask',
  '.opencode',
  'coverage',
  '.vercel',
]);

export interface RepoReviewPlan {
  root: string;
  targets: Array<{ path: string; kind: ContentKind; bytes: number }>;
  dimensions: readonly ReviewDimension[];
  maxFiles: number;
  truncated: boolean;
}

export type ContentKind = 'doc' | 'codigo-ts' | 'codigo-py' | 'datos-json' | 'texto';

export function classifyContent(path: string): ContentKind {
  const lower = path.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.txt')) return 'doc';
  if (lower.endsWith('.json')) return 'datos-json';
  if (lower.endsWith('.py')) return 'codigo-py';
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'codigo-ts';
  return 'texto';
}

/** Presets de alcance reutilizable por el runner. */
export const REVIEW_SCOPES = {
  vendor: 'vendor',
  sources: 'learning/sources',
  docs: 'docs',
  src: 'packages/core/src',
  all: '',
} as const;
export type ReviewScope = keyof typeof REVIEW_SCOPES;

function walk(
  dirAbs: string,
  dirRel: string,
  out: Array<{ rel: string; abs: string; bytes: number }>,
  budget: { maxFiles: number },
): void {
  let entries: Dirent[];
  try {
    entries = readdirSync(dirAbs, { withFileTypes: true }) as Dirent[];
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    if (out.length >= budget.maxFiles) return;
    const rel = dirRel ? `${dirRel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(`${dirAbs}/${e.name}`, rel, out, budget);
    } else if (e.isFile()) {
      const dot = e.name.lastIndexOf('.');
      if (dot < 0) continue;
      if (!REVIEWABLE_EXT.has(e.name.slice(dot).toLowerCase())) continue;
      let size = 0;
      try {
        size = statSync(`${dirAbs}/${e.name}`).size;
      } catch {
        continue;
      }
      out.push({ rel, abs: `${dirAbs}/${e.name}`, bytes: size });
    }
  }
}

export function planRepoReview(
  root: string,
  scope: ReviewScope = 'all',
  maxFiles = 400,
  maxBytesPerFile = 512 * 1024,
): RepoReviewPlan {
  const baseRel = REVIEW_SCOPES[scope];
  const startAbs = baseRel ? `${root}/${baseRel}` : root;
  const found: Array<{ rel: string; abs: string; bytes: number }> = [];
  walk(startAbs, baseRel, found, { maxFiles });
  const targets = found
    .filter((f) => f.bytes <= maxBytesPerFile && f.bytes > 0)
    .map((f) => ({ path: f.rel, kind: classifyContent(f.rel), bytes: f.bytes }));
  return {
    root,
    targets,
    dimensions: REVIEW_DIMENSIONS,
    maxFiles,
    truncated: found.length >= maxFiles,
  };
}

/* ── Análisis (INSIGHTS) ──────────────────────────────────────────────── */

export interface Insight {
  dimension: ReviewDimension;
  /** 0..1 — intensidad señalada por la densidad de coincidencias. */
  score: number;
  /** Hasta 3 extractos literales (≤180 chars) como evidencia. */
  evidencias: string[];
}

export interface ReviewResult {
  path: string;
  kind: ContentKind;
  primaryDimensions: ReviewDimension[];
  techs: string[];
  insights: Insight[];
  lineCount: number;
  wordCount: number;
  /** sha256 de contenido, primeros 16 hex — dedupe idempotente. */
  hash: string;
}

function excerpt(line: string): string {
  const t = line.trim();
  return t.length <= 180 ? t : `${t.slice(0, 177)}...`;
}

export function extractInsights(path: string, content: string): Omit<ReviewResult, 'path'> {
  const lines = content.split(/\r?\n/);
  const insights: Insight[] = [];

  for (const dim of REVIEW_DIMENSIONS) {
    if (dim === 'tecnologias') continue; // vía léxico aparte
    const spec = DIMENSION_SPECS[dim];
    const evidencias: string[] = [];
    let matches = 0;
    for (const line of lines) {
      if (spec.patterns.some((re) => re.test(line))) {
        matches += 1;
        if (evidencias.length < 3) evidencias.push(excerpt(line));
      }
    }
    const score = Math.min(1, matches / spec.umbral);
    if (score > 0) insights.push({ dimension: dim, score, evidencias });
  }

  // Tecnologías por léxico sobre el texto completo.
  const techs: string[] = [];
  for (const [re, name] of TECH_LEXICON) {
    if (re.test(content)) techs.push(name);
  }
  if (techs.length > 0) {
    insights.push({
      dimension: 'tecnologias',
      score: Math.min(1, techs.length / 5),
      evidencias: techs.slice(0, 3),
    });
  }

  insights.sort((a, b) => b.score - a.score || a.dimension.localeCompare(b.dimension));
  const primaryDimensions = insights.filter((i) => i.score >= 0.5).map((i) => i.dimension);

  const hash = createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 16);
  return {
    kind: classifyContent(path),
    primaryDimensions: primaryDimensions.length > 0 ? primaryDimensions : insights.slice(0, 1).map((i) => i.dimension),
    techs,
    insights,
    lineCount: lines.length,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    hash,
  };
}

/** Dedupe por hash de contenido (mismo blob revisado una sola vez). */
export function dedupeResults(results: ReviewResult[]): ReviewResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.hash)) return false;
    seen.add(r.hash);
    return true;
  });
}

/* ── Truth docs (aprendizaje hacia la nube documental) ────────────────── */

/** Umbral mínimo de señal para convertir un archivo en doc de verdad. */
export const TRUTH_MIN_SCORE = 0.34;

export function buildTruthDocs(results: ReviewResult[], fuenteTag: string): TruthDoc[] {
  const docs: TruthDoc[] = [];
  for (const r of results) {
    const top = r.insights[0];
    if (!top || top.score < TRUTH_MIN_SCORE) continue;
    // Evidencia sustantiva: excluye la lista sintética de tecnologías (ya está en texto).
    // Evidencia sustantiva con diversidad: round-robin entre dimensiones
    // (excluye la lista sintética de tecnologías, que ya vive en `texto`).
    const perDim = r.insights
      .filter((i) => i.dimension !== 'tecnologias')
      .map((i) => i.evidencias.map((e) => `[${i.dimension}] ${e}`));
    const picked: string[] = [];
    let depth = 0;
    while (picked.length < 4 && depth < 3) {
      let added = false;
      for (const arr of perDim) {
        if (picked.length >= 4) break;
        if (depth < arr.length) {
          picked.push(arr[depth]);
          added = true;
        }
      }
      if (!added) break;
      depth += 1;
    }
    const evidencia = picked.join('\n');
    docs.push({
      id: `reporeview-${r.hash}`,
      texto: `${r.path} (${r.kind}) — dimensiones: ${r.primaryDimensions.join(', ') || 'n/a'}${
        r.techs.length ? ` · tech: ${r.techs.join(', ')}` : ''
      }`,
      respuesta: evidencia || '(sin evidencia textual)',
      tipo: r.kind,
      fuente: fuenteTag,
    });
  }
  return docs;
}

/* ── Manifest + Report (deterministas) ────────────────────────────────── */

export interface ReviewManifest {
  runId: string;
  root: string;
  scope: string;
  totalFiles: number;
  analyzedFiles: number;
  truthDocs: number;
  byDimension: Record<string, number>;
  topTechs: Array<{ name: string; count: number }>;
  files: Array<{ path: string; hash: string; primary: string[]; score: number }>;
}

export function buildReviewManifest(
  runId: string,
  root: string,
  scope: string,
  results: ReviewResult[],
): ReviewManifest {
  const byDimension: Record<string, number> = {};
  const techCount = new Map<string, number>();
  for (const r of results) {
    for (const i of r.insights) {
      byDimension[i.dimension] = (byDimension[i.dimension] ?? 0) + 1;
    }
    for (const t of r.techs) techCount.set(t, (techCount.get(t) ?? 0) + 1);
  }
  return {
    runId,
    root,
    scope,
    totalFiles: results.length,
    analyzedFiles: results.length,
    truthDocs: buildTruthDocs(results, 'reporeview').length,
    byDimension,
    topTechs: [...techCount.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 12),
    files: results
      .map((r) => ({
        path: r.path,
        hash: r.hash,
        primary: r.primaryDimensions,
        score: r.insights[0]?.score ?? 0,
      }))
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)),
  };
}

export function buildReportMarkdown(manifest: ReviewManifest): string {
  const L: string[] = [];
  L.push(`# Repo Review — ${manifest.runId}`);
  L.push('');
  L.push(`- Alcance: \`${manifest.scope || '(repo)'}\` · raíz: \`${manifest.root}\``);
  L.push(`- Archivos analizados: **${manifest.analyzedFiles}** · docs de verdad generados: **${manifest.truthDocs}**`);
  L.push('');
  L.push('## Señales por dimensión');
  L.push('');
  L.push('| Dimensión | Archivos con señal |');
  L.push('|---|---|');
  for (const d of REVIEW_DIMENSIONS) {
    L.push(`| ${d} | ${manifest.byDimension[d] ?? 0} |`);
  }
  L.push('');
  if (manifest.topTechs.length > 0) {
    L.push('## Tecnologías detectadas (top)');
    L.push('');
    L.push('| Tecnología | Apariciones |');
    L.push('|---|---|');
    for (const t of manifest.topTechs) L.push(`| ${t.name} | ${t.count} |`);
    L.push('');
  }
  L.push('## Archivos más ricos en conocimiento (top 15)');
  L.push('');
  L.push('| Archivo | Señal | Dimensiones primarias |');
  L.push('|---|---|---|');
  for (const f of manifest.files.slice(0, 15)) {
    L.push(`| ${f.path} | ${f.score.toFixed(2)} | ${f.primary.join(', ') || '—'} |`);
  }
  L.push('');
  return L.join('\n');
}
