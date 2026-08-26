import type { BuilderElement } from './blocks';
import { blockChildren } from './blocks';

/* ============================================================
   Generación de código (HTML/CSS/JS, React+Tailwind, fragmento)
   Funciones puras — sin dependencias de React ni del DOM.
   ============================================================ */

const DEFAULT_BG = '#08080a';
const DEFAULT_TEXT = '#e5e5e5';
const PRIMARY = '#8b5cf6';

export interface StandaloneCode {
  html: string;
  css: string;
  js: string;
}

/* ---------- utilidades de escape ---------- */

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

function escText(value: unknown): string {
  return String(value ?? '').replace(/[&<>]/g, (c) => ESC[c]);
}

function jsxText(value: unknown): string {
  return String(value ?? '').replace(/[&<>]/g, (c) => ESC[c]);
}

function jsxAttr(value: unknown): string {
  return String(value ?? '').replace(/[&<>"]/g, (c) => ESC[c]);
}

function indent(text: string, level: number): string {
  const pad = '  '.repeat(level);
  return text
    .split('\n')
    .map((line) => (line.trim() === '' ? line : pad + line))
    .join('\n');
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'proyecto'
  );
}

/* ---------- valores derivados de props ---------- */

function buttonRadiusPx(radius: string): number {
  if (radius === 'sm') return 6;
  if (radius === 'full') return 999;
  return 10;
}

function imageRadiusPx(radius: string): number {
  if (radius === 'sm') return 6;
  if (radius === 'lg') return 12;
  if (radius === 'full') return 999;
  return 10;
}

function linkSizePx(size: string): number {
  if (size === 'sm') return 12;
  if (size === 'lg') return 16;
  return 14;
}

/* ============================================================
   HTML + CSS + JS (página autónoma en un solo archivo)
   ============================================================ */

function htmlBlock(el: BuilderElement): string {
  const p = el.props;
  switch (el.type) {
    case 'heading': {
      const tag = p.size === 'h1' ? 'h1' : p.size === 'h3' ? 'h3' : 'h2';
      return `<!-- Encabezado -->\n<${tag} class="heading heading-${p.size ?? 'h2'}" style="text-align:${p.align ?? 'left'};color:${esc(p.color)}">${escText(p.text)}</${tag}>`;
    }
    case 'paragraph':
      return `<!-- Párrafo -->\n<p class="paragraph" style="text-align:${p.align ?? 'left'};color:${esc(p.color)}">${escText(p.text)}</p>`;
    case 'button': {
      const cls = p.variant === 'outline' ? 'btn btn-outline' : 'btn';
      return `<!-- Botón -->\n<a class="${cls}" href="${esc(p.href)}" style="border-radius:${buttonRadiusPx(p.radius)}px">${escText(p.text)}</a>`;
    }
    case 'image':
      return `<!-- Imagen -->\n<img class="img" src="${esc(p.src)}" alt="${esc(p.alt)}" style="width:${p.width}%;border-radius:${imageRadiusPx(p.radius)}px">`;
    case 'link':
      return `<!-- Enlace -->\n<a class="link" href="${esc(p.href)}" style="font-size:${linkSizePx(p.size)}px">${escText(p.text)}</a>`;
    case 'spacer':
      return `<!-- Separador -->\n<div class="spacer" style="height:${p.height}px" aria-hidden="true"></div>`;
    case 'columns': {
      const inner = blockChildren(el)
        .map((c) => `<div class="column">\n${indent(htmlBlock(c), 1)}\n</div>`)
        .join('\n');
      return `<!-- Columnas (${p.cols}) -->\n<div class="columns" style="grid-template-columns:repeat(${p.cols},1fr);gap:${p.gap}px">\n${inner}\n</div>`;
    }
    case 'container': {
      const inner = blockChildren(el).map((c) => indent(htmlBlock(c), 1)).join('\n');
      const cls = p.width === 'boxed' ? 'container boxed' : 'container';
      return `<!-- Contenedor -->\n<div class="${cls}" style="padding:${p.padding}px">\n${inner}\n</div>`;
    }
  }
}

function buildCss(projectName: string): string {
  return `/* ============================================================
   Estilos generados con UltraIa Builder — ${projectName}
   Tema oscuro por defecto, sin dependencias externas.
   ============================================================ */
:root {
  --bg: ${DEFAULT_BG};      /* Fondo de la página */
  --text: ${DEFAULT_TEXT};  /* Texto principal */
  --primary: ${PRIMARY};    /* Acento principal */
  --border: #2e2e3d;        /* Bordes */
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;
}
/* Encabezados */
.heading { margin: 0; font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; }
.heading-h1 { font-size: 2.25rem; }
.heading-h2 { font-size: 1.875rem; }
.heading-h3 { font-size: 1.5rem; }
/* Párrafos */
.paragraph { margin: 0; font-size: 1rem; }
/* Botones */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 600;
  text-decoration: none; background: var(--primary); color: #fff;
  transition: background 0.15s ease;
}
.btn:hover { background: #7c3aed; }
.btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
.btn-outline:hover { border-color: var(--primary); color: var(--primary); }
/* Imágenes */
.img { display: block; max-width: 100%; height: auto; object-fit: cover; }
/* Enlaces */
.link { color: var(--primary); text-decoration: none; font-weight: 500; }
.link:hover { text-decoration: underline; }
/* Separador */
.spacer { width: 100%; }
/* Columnas */
.columns { display: grid; width: 100%; }
.column { min-width: 0; }
/* Contenedor */
.container { width: 100%; }
.container.boxed { max-width: 960px; margin: 0 auto; }
/* Responsive: las columnas se apilan en pantallas pequeñas */
@media (max-width: 640px) {
  .columns { grid-template-columns: 1fr !important; }
}
`;
}

function buildJs(): string {
  return `// ============================================================
// Interacciones generadas con UltraIa Builder
// ============================================================

// Scroll suave para enlaces de anclaje internos (href="#...")
document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  link.addEventListener('click', function (event) {
    var target = document.querySelector(link.getAttribute('href'));
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
`;
}

export function generateHtmlCssJs(elements: BuilderElement[], projectName: string): StandaloneCode {
  const css = buildCss(projectName);
  const js = buildJs();
  const body = elements.map((el) => indent(htmlBlock(el), 1)).join('\n\n');
  const title = escText(projectName || 'Mi página');
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
${indent(css, 1)}
  </style>
</head>
<body>
${body}
  <script>
${indent(js, 1)}
  </script>
</body>
</html>
`;
  return { html, css, js };
}

/* ============================================================
   React + Tailwind (componente funcional de un solo archivo)
   ============================================================ */

function reactBlock(el: BuilderElement): string {
  const p = el.props;
  switch (el.type) {
    case 'heading': {
      const tag = p.size === 'h1' ? 'h1' : p.size === 'h3' ? 'h3' : 'h2';
      const size = p.size === 'h1' ? 'text-4xl' : p.size === 'h3' ? 'text-2xl' : 'text-3xl';
      const align = p.align === 'center' ? 'text-center' : p.align === 'right' ? 'text-right' : 'text-left';
      return `<${tag} className="font-display ${size} font-bold tracking-tight text-[${esc(p.color)}] ${align}">${jsxText(p.text)}</${tag}>`;
    }
    case 'paragraph': {
      const align = p.align === 'center' ? 'text-center' : p.align === 'right' ? 'text-right' : 'text-left';
      return `<p className="text-sm leading-relaxed text-[${esc(p.color)}] ${align}">${jsxText(p.text)}</p>`;
    }
    case 'button': {
      const variant =
        p.variant === 'outline'
          ? 'border border-[#2e2e3d] text-[#e5e5e5] hover:border-[#8b5cf6] hover:text-[#8b5cf6]'
          : 'bg-[#8b5cf6] text-white hover:bg-[#7c3aed]';
      const radius = p.radius === 'sm' ? 'rounded-md' : p.radius === 'full' ? 'rounded-full' : 'rounded-[10px]';
      return `<a href="${jsxAttr(p.href)}" className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold transition-colors ${variant} ${radius}">${jsxText(p.text)}</a>`;
    }
    case 'image': {
      const radius =
        p.radius === 'sm' ? 'rounded-md' : p.radius === 'lg' ? 'rounded-xl' : p.radius === 'full' ? 'rounded-full' : 'rounded-lg';
      return `<img src="${jsxAttr(p.src)}" alt="${jsxAttr(p.alt)}" className="block max-w-full ${radius}" style={{ width: '${p.width}%' }} />`;
    }
    case 'link': {
      const size = p.size === 'sm' ? 'text-xs' : p.size === 'lg' ? 'text-base' : 'text-sm';
      return `<a href="${jsxAttr(p.href)}" className="font-medium text-[#8b5cf6] hover:underline ${size}">${jsxText(p.text)}</a>`;
    }
    case 'spacer':
      return `<div className="h-[${p.height}px] w-full" aria-hidden="true" />`;
    case 'columns': {
      const cols = p.cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
      const inner = blockChildren(el).map((c) => indent(reactBlock(c), 1)).join('\n');
      return `<div className="grid grid-cols-1 gap-[${p.gap}px] ${cols}">\n${inner}\n</div>`;
    }
    case 'container': {
      const cls = p.width === 'boxed' ? 'mx-auto w-full max-w-5xl' : 'w-full';
      const inner = blockChildren(el).map((c) => indent(reactBlock(c), 1)).join('\n');
      return `<div className="${cls}" style={{ padding: ${p.padding} }}>\n${inner}\n</div>`;
    }
  }
}

export function generateReactTailwind(elements: BuilderElement[], projectName: string): string {
  const inner = elements.map((el) => indent(reactBlock(el), 1)).join('\n\n');
  return `// Componente React + Tailwind generado con UltraIa Builder
// Proyecto: ${projectName}
// Requisitos: React 19+, Tailwind CSS v3 o v4. Añade este componente
// a tu proyecto y exporta \`App\` donde lo necesites.

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-[#08080a] text-[#e5e5e5]">
${inner}
    </div>
  );
}
`;
}

/* ============================================================
   Fragmento HTML con estilos inline (para pegar en cualquier página)
   ============================================================ */

function fragmentBlock(el: BuilderElement): string {
  const p = el.props;
  switch (el.type) {
    case 'heading': {
      const tag = p.size === 'h1' ? 'h1' : p.size === 'h3' ? 'h3' : 'h2';
      const size = p.size === 'h1' ? '36px' : p.size === 'h3' ? '24px' : '30px';
      return `<${tag} style="margin:0;font-weight:700;line-height:1.15;letter-spacing:-0.02em;font-size:${size};text-align:${p.align ?? 'left'};color:${esc(p.color)}">${escText(p.text)}</${tag}>`;
    }
    case 'paragraph':
      return `<p style="margin:0;font-size:14px;line-height:1.6;text-align:${p.align ?? 'left'};color:${esc(p.color)}">${escText(p.text)}</p>`;
    case 'button': {
      const base = 'display:inline-block;padding:10px 20px;font-size:14px;font-weight:600;text-decoration:none;';
      const style =
        p.variant === 'outline'
          ? `${base}border:1px solid #2e2e3d;color:#e5e5e5;`
          : `${base}background:#8b5cf6;color:#fff;`;
      return `<a href="${esc(p.href)}" style="${style}border-radius:${buttonRadiusPx(p.radius)}px">${escText(p.text)}</a>`;
    }
    case 'image':
      return `<img src="${esc(p.src)}" alt="${esc(p.alt)}" style="display:block;max-width:100%;width:${p.width}%;border-radius:${imageRadiusPx(p.radius)}px">`;
    case 'link':
      return `<a href="${esc(p.href)}" style="color:#8b5cf6;font-weight:500;font-size:${linkSizePx(p.size)}px;text-decoration:none">${escText(p.text)}</a>`;
    case 'spacer':
      return `<div style="height:${p.height}px" aria-hidden="true"></div>`;
    case 'columns': {
      const inner = blockChildren(el)
        .map((c) => `<div style="min-width:0">\n${indent(fragmentBlock(c), 1)}\n</div>`)
        .join('\n');
      return `<div style="display:grid;grid-template-columns:repeat(${p.cols},1fr);gap:${p.gap}px">\n${inner}\n</div>`;
    }
    case 'container': {
      const inner = blockChildren(el).map((c) => indent(fragmentBlock(c), 1)).join('\n');
      const boxed = p.width === 'boxed' ? 'max-width:960px;margin:0 auto;' : 'width:100%;';
      return `<div style="padding:${p.padding}px;${boxed}">\n${inner}\n</div>`;
    }
  }
}

export function generateHtmlOnly(elements: BuilderElement[]): string {
  const inner = elements.map((el) => indent(fragmentBlock(el), 1)).join('\n');
  return `<div style="background:#08080a;color:#e5e5e5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px">
${inner}
</div>`;
}

export { slugify };