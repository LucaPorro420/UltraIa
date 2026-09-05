/**
 * Website Clone — AI-powered website reverse-engineering pipeline.
 *
 * Port of the principles from JCodesMore/ai-website-cloner-template (MIT).
 * Original pipeline: Reconnaissance → Foundation → Component Specs → Parallel Build → Assembly & QA.
 * This implementation is a DOMAIN-ONLY orchestrator: it plans the clone,
 * extracts structure from HTML, generates component specs, and produces
 * Next.js component code — without executing browser automation or builds.
 *
 * Attribution: Based on the multi-phase pipeline concept from
 * https://github.com/JCodesMore/ai-website-cloner-template (MIT).
 * Implementation is original; no code copied.
 */

import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export const CloneTargetSchema = z.object({
  url: z.string().url(),
  route: z.string().optional(),
  fidelity: z.enum(['pixel-perfect', 'structural', 'layout-only']).default('structural'),
});

export type CloneTarget = z.infer<typeof CloneTargetSchema>;

export interface ExtractedSection {
  name: string;
  selector: string;
  role: 'header' | 'hero' | 'features' | 'content' | 'cta' | 'footer' | 'nav' | 'sidebar' | 'custom';
  dom: DomNode;
  styles: Record<string, string>;
  text: string[];
  assets: ExtractedAsset[];
  interactionModel: 'static' | 'click-driven' | 'scroll-driven' | 'time-driven';
  responsive: ResponsiveBehavior;
}

export interface DomNode {
  tag: string;
  classes: string;
  text: string | null;
  children: DomNode[];
  style: Record<string, string>;
}

export interface ExtractedAsset {
  type: 'image' | 'video' | 'svg' | 'font' | 'icon';
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  localPath?: string;
}

export interface ResponsiveBehavior {
  desktop: string;
  tablet?: string;
  mobile?: string;
  breakpointPx?: number;
}

export interface ComponentSpec {
  name: string;
  targetFile: string;
  screenshot?: string;
  interactionModel: string;
  domStructure: string;
  computedStyles: Record<string, Record<string, string>>;
  states: StateSpec[];
  assets: ExtractedAsset[];
  textContent: string[];
  responsive: ResponsiveBehavior;
}

export interface StateSpec {
  name: string;
  trigger: string;
  before: Record<string, string>;
  after: Record<string, string>;
  transition: string;
}

export interface DesignTokens {
  colors: Record<string, string>;
  fonts: FontSpec[];
  spacing: string[];
  borderRadius: string[];
  shadows: string[];
}

export interface FontSpec {
  family: string;
  weights: string[];
  source: 'google' | 'local' | 'system';
}

export interface ClonePlan {
  target: CloneTarget;
  siteKey: string;
  pageKey: string;
  tokens: DesignTokens;
  sections: ExtractedSection[];
  specs: ComponentSpec[];
  assets: ExtractedAsset[];
  route: string;
  estimatedComponents: number;
}

export interface CloneResult {
  plan: ClonePlan;
  components: GeneratedComponent[];
  routeFile: string;
  layoutFile: string;
  globalsFile: string;
  manifest: CloneManifest;
}

export interface GeneratedComponent {
  name: string;
  filePath: string;
  code: string;
  spec: ComponentSpec;
}

export interface CloneManifest {
  sourceUrl: string;
  destinationRoute: string;
  componentsCreated: number;
  assetsDownloaded: number;
  sectionsBuilt: string[];
  buildStatus: 'pending' | 'pass' | 'fail';
}

// ── Utilities ────────────────────────────────────────────────────────────────

function slugify(url: string): string {
  try {
    const u = new URL(url);
    const origin = u.hostname.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const path = u.pathname === '/' ? 'root' : u.pathname.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    return `${origin}-${path}`.slice(0, 60);
  } catch {
    return 'unknown-site';
  }
}

function hashStr(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ── HTML Parsing (deterministic, no deps) ────────────────────────────────────

function extractText(html: string): string[] {
  const texts: string[] = [];
  const re = />([^<]+)</g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const t = m[1].trim();
    if (t && !t.startsWith('{') && !t.startsWith('//') && t.length > 2) {
      texts.push(t);
    }
  }
  return [...new Set(texts)];
}

function extractImages(html: string, baseUrl: string): ExtractedAsset[] {
  const assets: ExtractedAsset[] = [];
  // Match each <img> tag, then extract src and alt separately
  const imgTagRe = /<img\s[^>]*>/gi;
  let tagMatch;
  while ((tagMatch = imgTagRe.exec(html)) !== null) {
    const tag = tagMatch[0];
    const srcRe = /src=["']([^"']+)["']/i;
    const altRe = /alt=["']([^"']*)["']/i;
    const srcMatch = srcRe.exec(tag);
    if (!srcMatch) continue;
    let src = srcMatch[1];
    if (src.startsWith('//')) src = 'https:' + src;
    else if (src.startsWith('/') && baseUrl) {
      try { src = new URL(src, baseUrl).href; } catch { /* keep as-is */ }
    }
    const altMatch = altRe.exec(tag);
    assets.push({ type: 'image', src, alt: altMatch?.[1] || undefined });
  }
  const vidRe = /<video[^>]+src=["']([^"']+)["']/gi;
  let vm;
  while ((vm = vidRe.exec(html)) !== null) {
    let src = vm[1];
    if (src.startsWith('/') && baseUrl) {
      try { src = new URL(src, baseUrl).href; } catch { /* keep as-is */ }
    }
    assets.push({ type: 'video', src });
  }
  const svgRe = /<svg[\s>]/gi;
  let svgCount = 0;
  while (svgRe.exec(html)) svgCount++;
  if (svgCount > 0) {
    assets.push({ type: 'svg', src: `${svgCount} inline SVGs` });
  }
  return assets;
}

function extractColors(html: string): Record<string, string> {
  const colors: Record<string, string> = {};
  const hexRe = /#[0-9a-fA-F]{3,8}/g;
  let m;
  while ((m = hexRe.exec(html)) !== null) {
    colors[m[0]] = m[0];
  }
  const rgbRe = /rgba?\([^)]+\)/g;
  while ((m = rgbRe.exec(html)) !== null) {
    colors[m[0]] = m[0];
  }
  const oklchRe = /oklch\([^)]+\)/g;
  while ((m = oklchRe.exec(html)) !== null) {
    colors[m[0]] = m[0];
  }
  return colors;
}

function extractFonts(html: string): FontSpec[] {
  const fonts: FontSpec[] = [];
  const googleRe = /fonts\.googleapis\.com\/css2\?family=([^&"']+)/gi;
  let m;
  while ((m = googleRe.exec(html)) !== null) {
    const family = decodeURIComponent(m[1]).split(':')[0].replace(/\+/g, ' ');
    fonts.push({ family, weights: ['400', '700'], source: 'google' });
  }
  const localRe = /font-family:\s*['"]?([^'";\n]+)['"]?/gi;
  while ((m = localRe.exec(html)) !== null) {
    const family = m[1].trim();
    if (!fonts.find(f => f.family === family)) {
      fonts.push({ family, weights: ['400'], source: 'system' });
    }
  }
  return fonts;
}

function extractSections(html: string, baseUrl?: string): ExtractedSection[] {
  if (!html || !html.trim()) return [];
  const sections: ExtractedSection[] = [];
  const sectionRe = /<(header|main|footer|section|nav|aside|article)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  let idx = 0;
  while ((m = sectionRe.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    const content = m[2];
    const roleMap: Record<string, ExtractedSection['role']> = {
      header: 'header', nav: 'nav', main: 'content', footer: 'footer',
      section: idx === 0 ? 'hero' : 'content', aside: 'sidebar', article: 'content',
    };
    sections.push({
      name: `${tag}-${idx}`,
      selector: tag,
      role: roleMap[tag] || 'custom',
      dom: { tag, classes: '', text: null, children: [], style: {} },
      styles: {},
      text: extractText(content),
      assets: extractImages(content, baseUrl || ''),
      interactionModel: 'static',
      responsive: { desktop: 'default layout' },
    });
    idx++;
  }
  if (sections.length === 0) {
    sections.push({
      name: 'page-content',
      selector: 'body',
      role: 'content',
      dom: { tag: 'body', classes: '', text: null, children: [], style: {} },
      styles: {},
      text: extractText(html),
      assets: extractImages(html, baseUrl || ''),
      interactionModel: 'static',
      responsive: { desktop: 'default layout' },
    });
  }
  return sections;
}

// ── Component Code Generation ────────────────────────────────────────────────

function generateComponent(spec: ComponentSpec): string {
  const imports = ['import React from "react";'];
  if (spec.assets.some(a => a.type === 'image')) {
    imports.push('import Image from "next/image";');
  }

  const propsInterface = `interface ${spec.name}Props {\n  className?: string;\n}`;

  const styleEntries = Object.entries(spec.computedStyles);
  const styleBlock = styleEntries.length > 0
    ? `\nconst styles = {\n${styleEntries.map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`).join(',\n')}\n} as const;`
    : '';

  const jsxAttrs: string[] = [];
  if (spec.textContent.length > 0) {
    jsxAttrs.push(`      {/* ${spec.textContent.length} text blocks */}`);
  }
  if (spec.assets.length > 0) {
    jsxAttrs.push(`      {/* ${spec.assets.length} assets */}`);
  }

  const stateHandlers = spec.states
    .filter(s => s.trigger.includes('click'))
    .map(s => {
      const safeName = s.name.replace(/[^a-zA-Z0-9]/g, '');
      return `  const [${safeName}Open, set${safeName}Open] = React.useState(false);`;
    })
    .join('\n');

  return `${imports.join('\n')}

${propsInterface}
${styleBlock}

export function ${spec.name}({ className }: ${spec.name}Props) {
${stateHandlers || '  // No stateful interactions detected'}
  return (
    <section className={className ?? ""} data-component="${spec.name}">
      {/* Interaction model: ${spec.interactionModel} */}
      {/* Responsive: ${spec.responsive.desktop} */}
${jsxAttrs.join('\n') || '      {/* Content placeholder — fill with extracted content */}'}
    </section>
  );
}

export default ${spec.name};
`;
}

function generateRouteFile(components: GeneratedComponent[], route: string): string {
  const imports = components.map(c =>
    `import { ${c.name} } from "@/components${c.spec.targetFile.replace(/.*\/components/, '').replace(/\.tsx$/, '')}";`
  ).join('\n');

  const jsx = components.map(c => `      <${c.name} />`).join('\n');

  return `${imports}

export default function Page() {
  return (
    <main className="min-h-screen">
${jsx}
    </main>
  );
}
`;
}

function generateGlobals(tokens: DesignTokens, fonts: FontSpec[]): string {
  const colorVars = Object.entries(tokens.colors)
    .map(([k, v]) => `  --color-${k.replace(/[^a-z0-9]/g, '-')}: ${v};`)
    .join('\n');

  const fontFaces = fonts
    .filter(f => f.source === 'google')
    .map(f => `  font-family: "${f.family}", sans-serif;`)
    .join('\n');

  return `@import "tailwindcss";

:root {
${colorVars || '  /* No colors extracted — add design tokens */'}
}

body {
${fontFaces || '  font-family: system-ui, sans-serif;'}
}
`;
}

// ── Main API ─────────────────────────────────────────────────────────────────

/**
 * Plan a website clone operation. Takes a URL and produces a structured
 * clone plan with sections, specs, and component definitions.
 */
export function planClone(target: CloneTarget): ClonePlan {
  const siteKey = slugify(target.url);
  const pageKey = `page-${hashStr(target.url)}`;
  const route = target.route || '/';

  // These would be populated by browser extraction in a real pipeline
  const tokens: DesignTokens = {
    colors: {},
    fonts: [],
    spacing: [],
    borderRadius: [],
    shadows: [],
  };

  return {
    target,
    siteKey,
    pageKey,
    tokens,
    sections: [],
    specs: [],
    assets: [],
    route,
    estimatedComponents: 0,
  };
}

/**
 * Extract design tokens and structure from raw HTML.
 * Deterministic, keyless — parses HTML without browser automation.
 */
export function extractFromHtml(html: string, url: string): {
  tokens: DesignTokens;
  sections: ExtractedSection[];
  assets: ExtractedAsset[];
  texts: string[];
} {
  const tokens: DesignTokens = {
    colors: extractColors(html),
    fonts: extractFonts(html),
    spacing: [],
    borderRadius: [],
    shadows: [],
  };

  const sections = extractSections(html, url);
  const assets = extractImages(html, url);
  const texts = extractText(html);

  return { tokens, sections, assets, texts };
}

/**
 * Generate component specs from extracted sections.
 */
export function generateSpecs(sections: ExtractedSection[], siteKey: string, pageKey: string): ComponentSpec[] {
  return sections.map(s => ({
    name: s.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(''),
    targetFile: `/src/components/sites/${siteKey}/${pageKey}/${s.name}.tsx`,
    interactionModel: s.interactionModel,
    domStructure: `${s.dom.tag} > ${s.dom.children.length} children`,
    computedStyles: { container: s.styles },
    states: [],
    assets: s.assets,
    textContent: s.text,
    responsive: s.responsive,
  }));
}

/**
 * Generate full clone output: components, route, globals, manifest.
 */
export function generateCloneOutput(
  plan: ClonePlan,
  sections: ExtractedSection[],
  tokens: DesignTokens,
  fonts: FontSpec[],
  assets: ExtractedAsset[],
): CloneResult {
  const specs = generateSpecs(sections, plan.siteKey, plan.pageKey);
  const components = specs.map(spec => ({
    name: spec.name,
    filePath: spec.targetFile,
    code: generateComponent(spec),
    spec,
  }));

  const routeFile = generateRouteFile(components, plan.route);
  const globalsFile = generateGlobals(tokens, fonts);

  const manifest: CloneManifest = {
    sourceUrl: plan.target.url,
    destinationRoute: plan.route,
    componentsCreated: components.length,
    assetsDownloaded: assets.length,
    sectionsBuilt: sections.map(s => s.name),
    buildStatus: 'pending',
  };

  return {
    plan: { ...plan, tokens, sections, specs, assets, estimatedComponents: components.length },
    components,
    routeFile,
    layoutFile: '',
    globalsFile,
    manifest,
  };
}

// ── Tool Definition ──────────────────────────────────────────────────────────

export const cloneWebsiteTool = {
  name: 'clone_website',
  description: 'Plan and execute a website clone pipeline: extract structure from a URL, generate component specs, and produce Next.js code. Use when the user wants to clone, replicate, or reverse-engineer a website.',
  parameters: {
    url: { type: 'string', description: 'Target URL to clone', required: true },
    route: { type: 'string', description: 'Destination route (default: /)' },
    fidelity: { type: 'string', description: 'Fidelity level: pixel-perfect, structural, or layout-only (default: structural)' },
  },
  execute: async (args: Record<string, unknown>) => {
    const url = args.url as string;
    const route = (args.route as string) || '/';
    const fidelity = (args.fidelity as string) || 'structural';

    const target: CloneTarget = { url, route, fidelity: fidelity as CloneTarget['fidelity'] };
    const plan = planClone(target);

    return JSON.stringify({
      status: 'plan_ready',
      siteKey: plan.siteKey,
      pageKey: plan.pageKey,
      route: plan.route,
      nextSteps: [
        `1. Use agent-browser to navigate to ${url} and extract screenshots`,
        '2. Run extractFromHtml() with the page HTML to get tokens, sections, assets',
        '3. Run generateCloneOutput() to produce component code',
        '4. Write generated files to the project',
        '5. Run npm run build to verify',
      ],
      plan,
    }, null, 2);
  },
};

export const extractHtmlTool = {
  name: 'extract_html',
  description: 'Extract design tokens, sections, and assets from raw HTML. Use after fetching a page with webfetch or agent-browser.',
  parameters: {
    html: { type: 'string', description: 'Raw HTML content to parse', required: true },
    url: { type: 'string', description: 'Source URL (for resolving relative paths)', required: true },
  },
  execute: async (args: Record<string, unknown>) => {
    const html = args.html as string;
    const url = args.url as string;
    const result = extractFromHtml(html, url);
    return JSON.stringify(result, null, 2);
  },
};

export const generateComponentsTool = {
  name: 'generate_clone_components',
  description: 'Generate Next.js component code from extracted sections and design tokens.',
  parameters: {
    sections: { type: 'string', description: 'JSON array of ExtractedSection objects', required: true },
    tokens: { type: 'string', description: 'JSON DesignTokens object', required: true },
    siteKey: { type: 'string', description: 'Site key for namespacing', required: true },
    pageKey: { type: 'string', description: 'Page key for namespacing', required: true },
    url: { type: 'string', description: 'Source URL', required: true },
  },
  execute: async (args: Record<string, unknown>) => {
    const sections = JSON.parse(args.sections as string) as ExtractedSection[];
    const tokens = JSON.parse(args.tokens as string) as DesignTokens;
    const siteKey = args.siteKey as string;
    const pageKey = args.pageKey as string;
    const url = args.url as string;

    const plan = planClone({ url, route: '/', fidelity: 'structural' });
    plan.siteKey = siteKey;
    plan.pageKey = pageKey;

    const result = generateCloneOutput(plan, sections, tokens, tokens.fonts, []);
    return JSON.stringify({
      components: result.components.map(c => ({ name: c.name, filePath: c.filePath, codeLength: c.code.length })),
      routeFile: result.routeFile,
      globalsFile: result.globalsFile,
      manifest: result.manifest,
    }, null, 2);
  },
};
