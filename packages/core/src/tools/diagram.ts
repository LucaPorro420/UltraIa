/**
 * Editorial diagram generator — capability `diagram`.
 *
 * Original TS port of the design PRINCIPLES from
 * https://github.com/cathrynlavery/diagram-design (MIT) — 27 visual types,
 * editorial quality, self-contained HTML/SVG, no build step, no JS, no external
 * deps. No code copied: this is an original implementation of the pattern.
 *
 * Design rules ported:
 *  - Semantic tokens (paper / ink / muted / accent / hairline) resolved to the
 *    project's Dark Obsidian palette.
 *  - Anti-AI-slop geometry: every x/y/width/height/gap divisible by 4, 1px
 *    hairline borders, no shadows, max border-radius 10px, density 4/10, accent
 *    reserved for 1-2 focal elements.
 *  - Accessibility by default: `role="img"` + resolving `aria-labelledby` +
 *    first-child `<title>`/`<desc>`; per-diagram ID prefix so multiple SVGs can
 *    be inlined safely.
 *  - Self-contained output: single HTML file that opens offline, zero external
 *    network requests, no `<script>`.
 *
 * Kinds: `timeline` (events on an axis), `data-flow` (role-scoped pipeline
 * steps), `architecture` (components + connections), `loop` (flywheel: stations
 * around a hub with optional write-back arcs).
 * Variants: `minimal-dark` (default, Dark Obsidian) | `full-editorial` (adds
 * editorial summary card). Sizes: `doc-inline` (800) | `doc-wide` (1200).
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Tokens & layout constants                                           */
/* ------------------------------------------------------------------ */

export const DIAGRAM_TOKENS = {
  paper: '#08080a',
  paper2: '#111115',
  ink: '#e5e5ea',
  muted: '#8b8b98',
  accent: '#8b5cf6',
  hairline: '#1f1f2a',
} as const;

export const DIAGRAM_KINDS = ['timeline', 'data-flow', 'architecture', 'loop'] as const;
export type DiagramKind = (typeof DIAGRAM_KINDS)[number];

export const DIAGRAM_VARIANTS = ['minimal-dark', 'full-editorial'] as const;
export type DiagramVariant = (typeof DIAGRAM_VARIANTS)[number];

export const DIAGRAM_SIZES = ['doc-inline', 'doc-wide'] as const;
export type DiagramSize = (typeof DIAGRAM_SIZES)[number];

const SIZE_DIMS: Record<DiagramSize, { w: number; h: number }> = {
  'doc-inline': { w: 800, h: 420 },
  'doc-wide': { w: 1200, h: 480 },
};

/** Round to nearest multiple of 4 (the anti-slop geometry rule). */
export function round4(n: number): number {
  return Math.max(0, Math.round(n / 4) * 4);
}

/** Escape HTML entities in user-provided text. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Stable per-diagram ID prefix so inlined SVGs never collide. */
function idPrefix(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `dg-${slug || 'diagram'}`;
}

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

const nodeSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().min(1).max(120),
  sublabel: z.string().max(200).optional(),
  /** Focal node — drawn with the accent treatment (max 1-2 per diagram). */
  accent: z.boolean().optional(),
});

const edgeSchema = z.object({
  from: z.string().min(1).max(60),
  to: z.string().min(1).max(60),
  label: z.string().max(120).optional(),
  /** Dashed arc — used for write-backs / async flows. */
  dashed: z.boolean().optional(),
});

export const timelineSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(400).optional(),
  unit: z.string().max(40).optional(), // e.g. 'seconds'
  events: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        sublabel: z.string().max(200).optional(),
        start: z.number().min(0),
        end: z.number().min(0),
        accent: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(60),
});

export const dataFlowSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(400).optional(),
  steps: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        label: z.string().min(1).max(120),
        sublabel: z.string().max(200).optional(),
        role: z.string().max(80).optional(),
        accent: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(12),
});

export const architectureSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(400).optional(),
  nodes: z.array(nodeSchema).min(1).max(16),
  edges: z.array(edgeSchema).max(30).optional(),
});

export const loopSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(400).optional(),
  hub: z.object({
    label: z.string().min(1).max(120),
    sublabel: z.string().max(200).optional(),
  }),
  stations: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        label: z.string().min(1).max(120),
        sublabel: z.string().max(200).optional(),
        accent: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(10),
  /** Optional arcs back to the hub (dashed) — the "write-back" pattern. */
  writeBacks: z.array(z.string().min(1).max(60)).max(10).optional(),
});

export type TimelineSpec = z.infer<typeof timelineSchema>;
export type DataFlowSpec = z.infer<typeof dataFlowSchema>;
export type ArchitectureSpec = z.infer<typeof architectureSchema>;
export type LoopSpec = z.infer<typeof loopSchema>;

export interface DiagramOptions {
  variant?: DiagramVariant;
  size?: DiagramSize;
}

export interface RenderResult {
  html: string;
  svg: string;
  kind: DiagramKind;
  variant: DiagramVariant;
  size: DiagramSize;
  title: string;
  meta: { width: number; height: number; nodeCount: number; edgeCount: number };
}

/* ------------------------------------------------------------------ */
/* SVG building helpers                                                */
/* ------------------------------------------------------------------ */

function svgHeader(id: string, title: string, desc: string | undefined, w: number, h: number): string {
  const descEl = desc
    ? `<desc id="${id}-desc">${escapeHtml(desc)}</desc>`
    : `<desc id="${id}-desc">Editorial diagram: ${escapeHtml(title)}</desc>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${id}-title ${id}-desc" ` +
    `viewBox="0 0 ${w} ${h}" width="100%" height="auto" ` +
    `style="background:${DIAGRAM_TOKENS.paper};color:${DIAGRAM_TOKENS.ink};display:block;max-width:100%;height:auto;">` +
    `<title id="${id}-title">${escapeHtml(title)}</title>` +
    descEl +
    // Markers with per-diagram prefixed ids (safe to inline multiple SVGs).
    `<defs>` +
    `<marker id="${id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${DIAGRAM_TOKENS.muted}"/></marker>` +
    `<marker id="${id}-arrow-accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${DIAGRAM_TOKENS.accent}"/></marker>` +
    `</defs>`
  );
}

function nodeRect(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sublabel: string | undefined,
  opts: { accent?: boolean; radius?: number },
): string {
  const fill = DIAGRAM_TOKENS.paper2;
  const stroke = opts.accent ? DIAGRAM_TOKENS.accent : DIAGRAM_TOKENS.hairline;
  const strokeW = opts.accent ? 2 : 1;
  const r = round4(Math.min(opts.radius ?? 8, 10));
  const labelY = sublabel ? y + h / 2 - 2 : y + h / 2 + 4;
  const subY = sublabel ? y + h / 2 + 12 : y;
  return (
    `<g id="${id}">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>` +
    `<text x="${x + w / 2}" y="${labelY}" text-anchor="middle" font-family="'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif" font-size="13" font-weight="${opts.accent ? 700 : 500}" fill="${opts.accent ? DIAGRAM_TOKENS.accent : DIAGRAM_TOKENS.ink}">${escapeHtml(label)}</text>` +
    (sublabel
      ? `<text x="${x + w / 2}" y="${subY}" text-anchor="middle" font-family="'JetBrains Mono','Cascadia Mono',monospace" font-size="10" fill="${DIAGRAM_TOKENS.muted}">${escapeHtml(sublabel)}</text>`
      : '') +
    `</g>`
  );
}

function edgeLine(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  opts: { dashed?: boolean; accent?: boolean; label?: string },
): string {
  const dash = opts.dashed ? ' stroke-dasharray="6 4"' : '';
  const stroke = opts.accent ? DIAGRAM_TOKENS.accent : DIAGRAM_TOKENS.muted;
  const opacity = opts.accent ? 0.9 : 0.55;
  const labelEl = opts.label
    ? `<text x="${round4((x1 + x2) / 2)}" y="${round4(Math.max(0, (y1 + y2) / 2 - 6))}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="9" fill="${DIAGRAM_TOKENS.muted}">${escapeHtml(opts.label)}</text>`
    : '';
  return (
    `<g id="${id}">` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1" opacity="${opacity}"${dash}/>` +
    labelEl +
    `</g>`
  );
}

/* ------------------------------------------------------------------ */
/* Kind renderers                                                      */
/* ------------------------------------------------------------------ */

function renderTimeline(spec: TimelineSpec, opts: Required<DiagramOptions>): RenderResult {
  const { w, h } = SIZE_DIMS[opts.size];
  const id = idPrefix(spec.title);
  const headerH = opts.variant === 'full-editorial' ? 84 : 56;
  const axisY = round4(h - 96);
  const axisX0 = 32;
  const axisX1 = round4(w - 32);
  const axisW = axisX1 - axisX0;
  const maxT = Math.max(...spec.events.map((e) => e.end), 1);
  const tx = (t: number) => round4(axisX0 + (t / maxT) * axisW);

  let body = '';
  const hasAccent = spec.events.some((e) => e.accent);
  spec.events.forEach((ev, i) => {
    const x1 = tx(ev.start);
    const x2 = Math.max(round4(x1 + 4), tx(ev.end));
    const bw = Math.max(x2 - x1, 8);
    const y = round4(axisY - 34);
    const bh = 12;
    const accent = ev.accent === true || (!hasAccent && i === 0);
    const fill = accent ? DIAGRAM_TOKENS.accent : DIAGRAM_TOKENS.muted;
    body +=
      `<g id="${id}-ev-${i}">` +
      `<rect x="${x1}" y="${y}" width="${bw}" height="${bh}" rx="6" fill="${fill}" opacity="${accent ? 1 : 0.55}"/>` +
      `<text x="${round4(x1 + bw / 2)}" y="${round4(y - 8)}" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="11" font-weight="600" fill="${DIAGRAM_TOKENS.ink}">${escapeHtml(ev.label)}</text>` +
      (ev.sublabel
        ? `<text x="${round4(x1 + bw / 2)}" y="${round4(y - 8 + 14)}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="9" fill="${DIAGRAM_TOKENS.muted}">${escapeHtml(ev.sublabel)}</text>`
        : '') +
      `</g>`;
  });
  body +=
    `<line x1="${axisX0}" y1="${axisY}" x2="${axisX1}" y2="${axisY}" stroke="${DIAGRAM_TOKENS.hairline}" stroke-width="1"/>` +
    `<text x="${axisX0}" y="${round4(axisY + 22)}" font-family="'JetBrains Mono',monospace" font-size="9" fill="${DIAGRAM_TOKENS.muted}">0</text>` +
    `<text x="${round4(axisX1 - 24)}" y="${round4(axisY + 22)}" font-family="'JetBrains Mono',monospace" font-size="9" fill="${DIAGRAM_TOKENS.muted}">${spec.unit ? `${maxT} ${spec.unit}` : maxT}</text>`;

  const svg = svgHeader(id, spec.title, spec.description, w, h) + body + '</svg>';
  const html = shellHtml(spec.title, id, svg, opts, `timeline · ${spec.events.length} events`);
  return {
    html,
    svg,
    kind: 'timeline',
    variant: opts.variant,
    size: opts.size,
    title: spec.title,
    meta: { width: w, height: h, nodeCount: spec.events.length, edgeCount: 0 },
  };
}

function renderDataFlow(spec: DataFlowSpec, opts: Required<DiagramOptions>): RenderResult {
  const { w, h } = SIZE_DIMS[opts.size];
  const id = idPrefix(spec.title);
  const headerH = opts.variant === 'full-editorial' ? 84 : 56;
  const n = spec.steps.length;
  const boxW = Math.min(round4((w - 64) / n - 12), 180);
  const boxH = 64;
  const y = round4(headerH + (h - headerH) / 2 - boxH / 2);
  const cellW = (w - 64) / n;

  let body = '';
  spec.steps.forEach((step, i) => {
    const x = round4(32 + i * cellW + (cellW - boxW) / 2);
    const accent = step.accent === true || (i === 0 && !spec.steps.some((s) => s.accent));
    body += nodeRect(`${id}-node-${i}`, x, y, boxW, boxH, step.label, step.sublabel ?? step.role, { accent });
    if (i < n - 1) {
      const x2 = round4(32 + (i + 1) * cellW + (cellW - boxW) / 2);
      body +=
        `<line x1="${round4(x + boxW)}" y1="${round4(y + boxH / 2)}" x2="${round4(x2 - 4)}" y2="${round4(y + boxH / 2)}" stroke="${DIAGRAM_TOKENS.muted}" stroke-width="1" opacity="0.55" marker-end="url(#${id}-arrow)"/>`;
    }
  });

  const svg = svgHeader(id, spec.title, spec.description, w, h) + body + '</svg>';
  const html = shellHtml(spec.title, id, svg, opts, `data-flow · ${n} steps`);
  return {
    html,
    svg,
    kind: 'data-flow',
    variant: opts.variant,
    size: opts.size,
    title: spec.title,
    meta: { width: w, height: h, nodeCount: n, edgeCount: n - 1 },
  };
}

function renderArchitecture(spec: ArchitectureSpec, opts: Required<DiagramOptions>): RenderResult {
  const { w, h } = SIZE_DIMS[opts.size];
  const id = idPrefix(spec.title);
  const headerH = opts.variant === 'full-editorial' ? 84 : 56;
  const n = spec.nodes.length;
  const cols = Math.min(Math.ceil(Math.sqrt(n * 1.6)), 4);
  const rows = Math.ceil(n / cols);
  const boxW = Math.min(round4((w - 64) / cols - 12), 200);
  const boxH = 56;
  const areaW = w - 64;
  const areaH = h - headerH - 24;

  let body = '';
  const pos = new Map<string, { x: number; y: number }>();
  spec.nodes.forEach((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellW = areaW / cols;
    const cellH = areaH / rows;
    const x = round4(32 + col * cellW + (cellW - boxW) / 2);
    const y = round4(headerH + 12 + row * cellH + (cellH - boxH) / 2);
    pos.set(node.id, { x, y });
    body += nodeRect(`${id}-node-${node.id}`, x, y, boxW, boxH, node.label, node.sublabel, { accent: node.accent });
  });
  (spec.edges ?? []).forEach((edge, i) => {
    const a = pos.get(edge.from);
    const b = pos.get(edge.to);
    if (!a || !b) return;
    const x1 = round4(a.x + boxW / 2);
    const y1 = round4(a.y + boxH / 2);
    const x2 = round4(b.x + boxW / 2);
    const y2 = round4(b.y + boxH / 2);
    const dy = Math.abs(y2 - y1);
    if (dy <= 2) {
      body +=
        `<line x1="${x1}" y1="${y1}" x2="${round4(x2 - 8)}" y2="${y2}" stroke="${DIAGRAM_TOKENS.muted}" stroke-width="1" opacity="0.55"${edge.dashed ? ' stroke-dasharray="6 4"' : ''} marker-end="url(#${id}-arrow)"/>`;
    } else {
      const midY = round4((y1 + y2) / 2);
      body +=
        `<g id="${id}-edge-${i}">` +
        `<path d="M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}" fill="none" stroke="${DIAGRAM_TOKENS.muted}" stroke-width="1" opacity="0.55"${edge.dashed ? ' stroke-dasharray="6 4"' : ''} marker-end="url(#${id}-arrow)"/>` +
        (edge.label
          ? `<text x="${round4((x1 + x2) / 2)}" y="${round4(midY - 4)}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="9" fill="${DIAGRAM_TOKENS.muted}">${escapeHtml(edge.label)}</text>`
          : '') +
        `</g>`;
    }
  });

  const svg = svgHeader(id, spec.title, spec.description, w, h) + body + '</svg>';
  const html = shellHtml(spec.title, id, svg, opts, `architecture · ${n} nodes`);
  return {
    html,
    svg,
    kind: 'architecture',
    variant: opts.variant,
    size: opts.size,
    title: spec.title,
    meta: { width: w, height: h, nodeCount: n, edgeCount: (spec.edges ?? []).length },
  };
}

function renderLoop(spec: LoopSpec, opts: Required<DiagramOptions>): RenderResult {
  const { w, h } = SIZE_DIMS[opts.size];
  const id = idPrefix(spec.title);
  const headerH = opts.variant === 'full-editorial' ? 84 : 56;
  const cx = round4(w / 2);
  const cy = round4(headerH + (h - headerH) / 2);
  const radius = Math.min(round4(Math.min(w, h) / 2 - 40), 170);
  const hubR = 52;
  const n = spec.stations.length;

  let body = '';
  body +=
    `<g id="${id}-hub">` +
    `<circle cx="${cx}" cy="${cy}" r="${hubR}" fill="${DIAGRAM_TOKENS.paper2}" stroke="${DIAGRAM_TOKENS.accent}" stroke-width="2"/>` +
    `<text x="${cx}" y="${round4(cy - 4)}" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="13" font-weight="700" fill="${DIAGRAM_TOKENS.accent}">${escapeHtml(spec.hub.label)}</text>` +
    (spec.hub.sublabel
      ? `<text x="${cx}" y="${round4(cy + 14)}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="9" fill="${DIAGRAM_TOKENS.muted}">${escapeHtml(spec.hub.sublabel)}</text>`
      : '') +
    `</g>`;
  const stationW = 120;
  const stationH = 44;
  spec.stations.forEach((s, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const sx = round4(cx + radius * Math.cos(angle) - stationW / 2);
    const sy = round4(cy + radius * Math.sin(angle) - stationH / 2);
    body += nodeRect(`${id}-station-${s.id}`, sx, sy, stationW, stationH, s.label, s.sublabel, { accent: s.accent });
    const px = round4(cx + (radius - hubR - 8) * Math.cos(angle));
    const py = round4(cy + (radius - hubR - 8) * Math.sin(angle));
    const qx = round4(cx + (radius + stationH / 2) * Math.cos(angle));
    const qy = round4(cy + (radius + stationH / 2) * Math.sin(angle));
    body += `<line x1="${px}" y1="${py}" x2="${qx}" y2="${qy}" stroke="${DIAGRAM_TOKENS.hairline}" stroke-width="1"/>`;
    if (spec.writeBacks?.includes(s.id)) {
      const a1 = angle + 0.18;
      const a2 = angle - 0.18;
      body +=
        `<path d="M ${round4(cx + (hubR + 6) * Math.cos(a1))} ${round4(cy + (hubR + 6) * Math.sin(a1))} A ${round4(radius + 6)} ${round4(radius + 6)} 0 0 1 ${round4(cx + (hubR + 6) * Math.cos(a2))} ${round4(cy + (hubR + 6) * Math.sin(a2))}" fill="none" stroke="${DIAGRAM_TOKENS.accent}" stroke-width="1" stroke-dasharray="5 4" opacity="0.7" marker-end="url(#${id}-arrow-accent)"/>`;
    }
  });

  const svg = svgHeader(id, spec.title, spec.description, w, h) + body + '</svg>';
  const html = shellHtml(spec.title, id, svg, opts, `loop · hub + ${n} stations`);
  return {
    html,
    svg,
    kind: 'loop',
    variant: opts.variant,
    size: opts.size,
    title: spec.title,
    meta: { width: w, height: h, nodeCount: n + 1, edgeCount: n + (spec.writeBacks?.length ?? 0) },
  };
}

/* ------------------------------------------------------------------ */
/* HTML shell                                                          */
/* ------------------------------------------------------------------ */

function shellHtml(
  title: string,
  id: string,
  svg: string,
  opts: Required<DiagramOptions>,
  badge: string,
): string {
  const editorialCard =
    opts.variant === 'full-editorial'
      ? `<aside class="editorial-card"><p>${escapeHtml(badge)}</p></aside>`
      : '';
  return (
    `<!doctype html><html lang="es"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeHtml(title)} — UltraIa diagram</title>` +
    `<style>` +
    `:root{--paper:${DIAGRAM_TOKENS.paper};--paper2:${DIAGRAM_TOKENS.paper2};--ink:${DIAGRAM_TOKENS.ink};--muted:${DIAGRAM_TOKENS.muted};--accent:${DIAGRAM_TOKENS.accent};--hairline:${DIAGRAM_TOKENS.hairline}}` +
    `*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;padding:24px}` +
    `.diagram-wrap{max-width:1200px;margin:0 auto;border:1px solid var(--hairline);border-radius:10px;padding:16px;background:var(--paper)}` +
    `.editorial-card{margin-top:12px;padding:12px 16px;border-left:2px solid var(--accent);background:var(--paper2);border-radius:0 8px 8px 0;font-size:12px;color:var(--muted)}` +
    `@media (prefers-reduced-motion:reduce){svg{animation:none!important}}` +
    `</style></head><body><div class="diagram-wrap">${svg}${editorialCard}</div></body></html>`
  );
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Render an editorial diagram as self-contained HTML (plus the raw SVG).
 * Deterministic: same input → identical bytes.
 */
export function renderEditorialDiagram(
  kind: DiagramKind,
  spec: TimelineSpec | DataFlowSpec | ArchitectureSpec | LoopSpec,
  options: DiagramOptions = {},
): RenderResult {
  const opts: Required<DiagramOptions> = {
    variant: options.variant ?? 'minimal-dark',
    size: options.size ?? 'doc-inline',
  };
  switch (kind) {
    case 'timeline':
      return renderTimeline(timelineSchema.parse(spec), opts);
    case 'data-flow':
      return renderDataFlow(dataFlowSchema.parse(spec), opts);
    case 'architecture':
      return renderArchitecture(architectureSchema.parse(spec), opts);
    case 'loop':
      return renderLoop(loopSchema.parse(spec), opts);
    default: {
      const exhaustive: never = kind;
      throw new Error(`kind desconocido: ${String(exhaustive)}`);
    }
  }
}

/** Convenience: render a timeline from a motion-spec-like scene list. */
export function timelineFromScenes(
  title: string,
  scenes: Array<{ label: string; start: number; end: number; sublabel?: string }>,
  options: DiagramOptions & { unit?: string } = {},
): RenderResult {
  return renderEditorialDiagram(
    'timeline',
    {
      title,
      unit: options.unit ?? 's',
      events: scenes.map((s) => ({ label: s.label, sublabel: s.sublabel, start: s.start, end: s.end })),
    },
    options,
  );
}

export const diagram = {
  renderEditorialDiagram,
  timelineFromScenes,
  round4,
  escapeHtml,
  DIAGRAM_TOKENS,
  KINDS: DIAGRAM_KINDS,
};
