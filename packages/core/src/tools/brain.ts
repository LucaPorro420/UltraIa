// -----------------------------------------------------------------------------
// brain.ts - capability `brain_memory`
// -----------------------------------------------------------------------------
// Patron brain.md (fuente: learning/sources/brain-md.md + websearch 20/08/2026,
// repo mindmuxai/brain.md, Apache-2.0). Port ORIGINAL de los PRINCIPIOS
// (nada de codigo copiado, attribution header) en el estilo del dominio puro
// de UltraIa (determinista, sin red, sin deps nuevas).
//
// Principios portados:
// - "El conocimiento del agente no vive en ningun lugar durable": decisiones,
//   restricciones y razones mueren con la sesion. Aqui: BRAIN.md + paginas.
// - Una pagina = `compiled_truth` (entendimiento actual, reescribible ENTERO)
//   + `timeline` (cadena append-only de como se llego ahi).
// - "Correct by construction": reescribir la verdad y anadir su entrada de
//   timeline ocurren en UNA escritura atomica (updateTruth) -> el entendimiento
//   nunca cambia sin dejar rastro. No hay validador porque no hace falta.
// - Reversiones: no editar historia en silencio, anadir `reversal` al timeline.
// - Test de pertenencia: "seguira importando en 6 meses y es dificil de
//   reconstruir desde el codigo?" Si -> al brain. Detalles de implementacion
//   pura -> se quedan donde estan.
// - 6 root pages fijas (background, architecture, flow, mindmap, stack,
//   roadmap) + paginas ilimitadas (decision, concept, reference, lesson...).
// -----------------------------------------------------------------------------

/** Categorias de pagina (root pages fijas + paginas libres). */
export type BrainCategory =
  | 'background'
  | 'architecture'
  | 'flow'
  | 'mindmap'
  | 'stack'
  | 'roadmap'
  | 'decision'
  | 'concept'
  | 'reference'
  | 'lesson';

/** Tipos de entrada de timeline (append-only). */
export type TimelineKind = 'evidence' | 'update' | 'reversal' | 'note';

/** Entrada de timeline: como se llego a la verdad actual. */
export type BrainTimelineEntry = {
  at: string;
  kind: TimelineKind;
  summary: string;
};

/** Pagina del brain: la unidad durable de conocimiento. */
export type BrainPage = {
  id: string;
  category: BrainCategory;
  title: string;
  /** Entendimiento actual (reescribible ENTERO via updateTruth). */
  compiledTruth: string;
  /** Cadena append-only: nunca se borra ni se edita. */
  timeline: BrainTimelineEntry[];
};

/** Indice del brain: coleccion de paginas. */
export type BrainIndex = { pages: BrainPage[] };

/** Root pages fijas del protocolo brain.md. */
export const BRAIN_ROOT_PAGES: ReadonlyArray<{ id: string; title: string }> = [
  { id: 'background', title: 'Proyecto a simple vista' },
  { id: 'architecture', title: 'Arquitectura' },
  { id: 'flow', title: 'Flujo de trabajo' },
  { id: 'mindmap', title: 'Mapa mental' },
  { id: 'stack', title: 'Stack tecnologico' },
  { id: 'roadmap', title: 'Roadmap' },
];

/** Translitera acentos/simbolos comunes a ASCII (determinista). */
const ACCENTS: ReadonlyArray<[RegExp, string]> = [
  [/[áàâä]/g, 'a'],
  [/[éèêë]/g, 'e'],
  [/[íìîï]/g, 'i'],
  [/[óòôö]/g, 'o'],
  [/[úùûü]/g, 'u'],
  [/ñ/g, 'n'],
  [/ç/g, 'c'],
];

/** Normaliza un id de pagina: slug simple (minusculas, sin acentos, guiones, alnum). */
export function normalizeBrainId(id: string): string {
  let clean = id.toLowerCase().trim();
  for (const [re, sub] of ACCENTS) clean = clean.replace(re, sub);
  const slug = clean
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'pagina';
}

/** Crea una pagina nueva (con entrada inicial de timeline). */
export function createBrainPage(
  id: string,
  input: { category: BrainCategory; title: string; compiledTruth: string; at: string },
): BrainPage {
  return {
    id: normalizeBrainId(id),
    category: input.category,
    title: input.title.trim(),
    compiledTruth: input.compiledTruth.trim(),
    timeline: [{ at: input.at, kind: 'note', summary: 'Pagina creada' }],
  };
}

/**
 * updateTruth: reescribe la verdad COMPLETA y anade su entrada de timeline en
 * UNA operacion atomica (pura) -> el entendimiento nunca cambia sin rastro.
 * Devuelve una pagina NUEVA; no muta la original.
 */
export function updateBrainTruth(
  page: BrainPage,
  newTruth: string,
  summary: string,
  at: string,
  kind: TimelineKind = 'update',
): BrainPage {
  const truth = newTruth.trim();
  if (truth === page.compiledTruth && summary.trim() === '') {
    return page; // sin cambio -> misma pagina (idempotente)
  }
  return {
    ...page,
    compiledTruth: truth,
    timeline: [...page.timeline, { at, kind, summary: summary.trim() }],
  };
}

/** Anade una entrada al timeline sin tocar la verdad (evidencia, nota...). */
export function appendBrainTimeline(
  page: BrainPage,
  entry: { at: string; kind: TimelineKind; summary: string },
): BrainPage {
  return { ...page, timeline: [...page.timeline, entry] };
}

/** Registra una REVERSION explicita (no se edita historia en silencio). */
export function reverseBrainTruth(page: BrainPage, newTruth: string, reason: string, at: string): BrainPage {
  return updateBrainTruth(page, newTruth, reason, at, 'reversal');
}

/** Crea el indice vacio. */
export function emptyBrain(): BrainIndex {
  return { pages: [] };
}

/** Lista paginas (orden: root pages fijas primero, luego por id asc). */
export function listBrainPages(index: BrainIndex): BrainPage[] {
  const root = BRAIN_ROOT_PAGES.map((r) => r.id);
  return [...index.pages].sort((a, b) => {
    const ra = root.indexOf(a.id);
    const rb = root.indexOf(b.id);
    if (ra >= 0 && rb >= 0) return ra - rb;
    if (ra >= 0) return -1;
    if (rb >= 0) return 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Lee una pagina por id (undefined si no existe). */
export function readBrainPage(index: BrainIndex, id: string): BrainPage | undefined {
  const nid = normalizeBrainId(id);
  return index.pages.find((p) => p.id === nid);
}

/** Upsert de pagina en el indice (pura): reemplaza o anade. */
export function upsertBrainPage(index: BrainIndex, page: BrainPage): BrainIndex {
  const others = index.pages.filter((p) => p.id !== page.id);
  return { pages: [...others, page] };
}

/** Busca paginas por terminos (tokens simples, case-insensitive). */
export function searchBrainPages(index: BrainIndex, query: string): BrainPage[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return index.pages.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.compiledTruth.toLowerCase().includes(q) ||
      p.timeline.some((t) => t.summary.toLowerCase().includes(q)),
  );
}

/**
 * lintBrain: detecta enlaces rotos `[[id]]` dentro de truths/titulos que no
 * apuntan a ninguna pagina existente. Devuelve los rotos (determinista).
 */
export function lintBrainLinks(index: BrainIndex): Array<{ from: string; to: string }> {
  const ids = new Set(index.pages.map((p) => p.id));
  const broken: Array<{ from: string; to: string }> = [];
  for (const p of index.pages) {
    const haystack = `${p.title} ${p.compiledTruth} ${p.timeline.map((t) => t.summary).join(' ')}`;
    const matches = haystack.match(/\[\[([^\]]+)\]\]/g) ?? [];
    for (const m of matches) {
      const to = normalizeBrainId(m.slice(2, -2));
      if (to && !ids.has(to)) broken.push({ from: p.id, to });
    }
  }
  broken.sort((a, b) => (a.from === b.from ? (a.to < b.to ? -1 : 1) : a.from < b.from ? -1 : 1));
  return broken;
}

/** Render BRAIN.md (indice + paginas con frontmatter + timeline). */
export function renderBrainMarkdown(index: BrainIndex): string {
  const pages = listBrainPages(index);
  const lines: string[] = [
    '# BRAIN.md - memoria persistente del proyecto',
    '',
    '> Protocolo brain.md (port UltraIa): decisiones, restricciones y razones',
    '> durables en Markdown plano, viajan en git y sobreviven a cada sesion.',
    '> Regla: toda escritura pasa por updateTruth (verdad + timeline en una',
    '> operacion atomica). Nunca editar paginas a mano.',
    '',
    '## Indice',
    '',
  ];
  for (const p of pages) {
    lines.push(`- [${p.title}](#${p.id}) (${p.category})`);
  }
  lines.push('', '---', '');
  for (const p of pages) {
    lines.push(`## ${p.id}`, '');
    lines.push(`- **Categoria**: ${p.category}`);
    lines.push(`- **Titulo**: ${p.title}`);
    lines.push('', '### compiled_truth', '', p.compiledTruth, '', '### timeline');
    for (const t of p.timeline) {
      lines.push(`- \`${t.at}\` [${t.kind}] ${t.summary}`);
    }
    lines.push('', '---', '');
  }
  return lines.join('\n');
}

/** Render de UNA pagina (para brain/<id>.md). */
export function renderBrainPageMarkdown(page: BrainPage): string {
  return [
    `---`,
    `id: ${page.id}`,
    `category: ${page.category}`,
    `title: ${page.title}`,
    `---`,
    ``,
    `# ${page.title}`,
    ``,
    `## compiled_truth`,
    ``,
    page.compiledTruth,
    ``,
    `## timeline`,
    ``,
    ...page.timeline.map((t) => `- \`${t.at}\` [${t.kind}] ${t.summary}`),
    ``,
  ].join('\n');
}

/** Estadisticas del brain (deterministas, para reporte). */
export function brainStats(index: BrainIndex): {
  total: number;
  porCategoria: Record<string, number>;
  entradasTimeline: number;
  enlacesRotos: number;
} {
  const porCategoria: Record<string, number> = {};
  for (const p of index.pages) porCategoria[p.category] = (porCategoria[p.category] ?? 0) + 1;
  return {
    total: index.pages.length,
    porCategoria,
    entradasTimeline: index.pages.reduce((s, p) => s + p.timeline.length, 0),
    enlacesRotos: lintBrainLinks(index).length,
  };
}

export const brainMemory = {
  normalizeBrainId,
  createBrainPage,
  updateBrainTruth,
  appendBrainTimeline,
  reverseBrainTruth,
  emptyBrain,
  listBrainPages,
  readBrainPage,
  upsertBrainPage,
  searchBrainPages,
  lintBrainLinks,
  renderBrainMarkdown,
  renderBrainPageMarkdown,
  brainStats,
  BRAIN_ROOT_PAGES,
};