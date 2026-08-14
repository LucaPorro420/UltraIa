// //! Seed de la LIBRERIA DE PROMPTS de UltraIa (estilo MeiGEN).
// * Intenta descargar la libreria completa (~1.400 prompts rankeados por
// * engagement) desde jau123/nanobanana-trending-prompts (el repo que alimenta
// * la galeria de MeiGEN). Si la red falla, usa un subset curado embebido.
// * Idempotente: upsert por slug; los prompts aportados por usuarios
// * (isUserSubmitted=true) nunca se tocan.
// * Correr con: node packages/core/prisma/seed-library.mjs
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();

const PROMPTS_URL =
  'https://raw.githubusercontent.com/jau123/nanobanana-trending-prompts/main/prompts/prompts.json';

const CATEGORIES = [
  'Portrait',
  'Ads & Product',
  'Poster',
  'Illustration & 3D',
  'UI Design',
  'Video',
  'Wallpaper',
  'Branding',
  'Custom',
];

function slugify(s) {
  const base = s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const h = createHash('sha1').update(s).digest('hex').slice(0, 8);
  return base ? `${base}-${h}` : `prompt-${h}`;
}

function normCategory(raw) {
  const r = String(raw || '').toLowerCase();
  if (/(portrait|person|people|face|selfie|woman|man|model)/.test(r)) return 'Portrait';
  if (/(product|ad|ads|commercial|packaging|brand|logo)/.test(r)) return 'Ads & Product';
  if (/(poster|key visual|print|graphic)/.test(r)) return 'Poster';
  if (/(3d|illustration|render|character|concept art|digital art)/.test(r)) return 'Illustration & 3D';
  if (/(ui|interface|app|dashboard|web design|website)/.test(r)) return 'UI Design';
  if (/(video|film|cinematic|storyboard|motion)/.test(r)) return 'Video';
  if (/(wallpaper|desktop|phone|background)/.test(r)) return 'Wallpaper';
  return 'Custom';
}

function pickUrl(obj) {
  if (typeof obj.imageUrl === 'string') return obj.imageUrl;
  if (typeof obj.image === 'string') return obj.image;
  if (Array.isArray(obj.images) && obj.images.length) {
    const first = obj.images[0];
    return typeof first === 'string' ? first : first?.url ?? null;
  }
  if (Array.isArray(obj.image_urls) && obj.image_urls.length) return obj.image_urls[0];
  return null;
}

function pickRank(obj) {
  const v = obj.engagement ?? obj.likes ?? obj.rank ?? obj.score ?? obj.engagements;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function pickModels(obj) {
  const raw = obj.models ?? obj.model ?? obj.tags;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean).slice(0, 4);
  if (typeof raw === 'string' && raw) return [raw];
  return [];
}

// * Recorre el JSON de forma tolerante: encuentra objetos con campo `prompt`.
function collectPrompts(node, out, seen) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectPrompts(item, out, seen);
    return;
  }
  const p = node.prompt ?? node.prompt_text ?? node.text;
  if (typeof p === 'string' && p.trim().length >= 20) {
    const prompt = p.trim();
    const key = prompt.slice(0, 120);
    if (!seen.has(key)) {
      seen.add(key);
      out.push({
        prompt,
        category: normCategory(node.category ?? node.title ?? node.tags ?? ''),
        tags: Array.isArray(node.tags)
          ? node.tags.map(String)
          : typeof node.tags === 'string' && node.tags
            ? [node.tags]
            : [],
        models: pickModels(node),
        imageUrl: pickUrl(node),
        sourceUrl: typeof node.url === 'string' ? node.url : null,
        engagementRank: pickRank(node),
        aspectRatio: typeof node.aspectRatio === 'string' ? node.aspectRatio : '1:1',
      });
    }
    return;
  }
  for (const value of Object.values(node)) collectPrompts(value, out, seen);
}

async function fetchRemote() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(PROMPTS_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const out = [];
    collectPrompts(json, out, new Set());
    return out;
  } finally {
    clearTimeout(timer);
  }
}

// * Subset curado embebido (fallback offline). Las imagenes se sirven de
// * Pollinations (keyless) y cumplen el CSP img-src de la app.
const FALLBACK = [
  { prompt: 'High-fashion cinematic portrait of a woman in a structured emerald gown, dramatic rim lighting, editorial Vogue style, 85mm lens, shallow depth of field, dark studio background', category: 'Portrait', tags: ['editorial', 'fashion', 'cinematic'], models: ['gpt-image-2'], rank: 9800, ratio: '2:3' },
  { prompt: 'Close-up portrait of an elderly fisherman with weathered skin and wise eyes, golden hour, documentary photography, sharp details, natural light', category: 'Portrait', tags: ['documentary', 'golden hour'], models: ['gpt-image-2'], rank: 8700, ratio: '3:4' },
  { prompt: '3x3 Instagram feed grid featuring an attractive young woman traveling in Istanbul, natural smartphone photos, thin white borders, same woman across all images', category: 'Portrait', tags: ['instagram', 'travel', 'grid'], models: ['nanobanana'], rank: 9200, ratio: '1:1' },
  { prompt: 'Cyberpunk portrait of a woman with neon violet hair and reflective visor, rain-soaked Tokyo street at night, blade-runner aesthetic, cinematic bokeh', category: 'Portrait', tags: ['cyberpunk', 'neon'], models: ['midjourney'], rank: 8500, ratio: '2:3' },
  { prompt: 'Studio product shot of a premium coffee brand: matte black bag with gold typography on a travertine pedestal, soft shadows, minimalist composition, commercial photography', category: 'Ads & Product', tags: ['product', 'minimal'], models: ['gpt-image-2'], rank: 8100, ratio: '1:1' },
  { prompt: 'Advertising photo of a luxury smartwatch floating above rippling water, hero lighting, splash frozen in time, brand campaign style, ultra sharp', category: 'Ads & Product', tags: ['campaign', 'hero'], models: ['gpt-image-2'], rank: 7900, ratio: '4:5' },
  { prompt: 'Packaging design mockup of a natural skincare line: frosted glass jars with cork lids on a warm linen background, soft morning light, botanical shadows', category: 'Ads & Product', tags: ['packaging', 'skincare'], models: ['nanobanana'], rank: 7400, ratio: '1:1' },
  { prompt: 'Sneaker commercial shot: white sneaker floating at a 45-degree angle with paint splash in brand colors, studio gradient background, dynamic product photography', category: 'Ads & Product', tags: ['sneaker', 'splash'], models: ['gpt-image-2'], rank: 7200, ratio: '4:3' },
  { prompt: 'Cinematic movie poster for a sci-fi thriller: lone astronaut silhouette against a colossal ringed planet, teal and orange grade, film grain, epic scale', category: 'Poster', tags: ['movie', 'sci-fi'], models: ['midjourney'], rank: 8900, ratio: '2:3' },
  { prompt: 'Bold typographic concert poster for a synthwave festival, chrome 3D lettering, retro grid horizon, neon pink and purple, risograph texture', category: 'Poster', tags: ['typography', 'synthwave'], models: ['gpt-image-2'], rank: 7700, ratio: '2:3' },
  { prompt: 'Minimal Swiss-style poster for a design conference, brutalist grid, huge Helvetica type, limited palette of black white and electric blue, layout design', category: 'Poster', tags: ['swiss', 'minimal'], models: ['nanobanana'], rank: 7000, ratio: '2:3' },
  { prompt: 'Retro travel poster of a coastal mediterranean town, vintage 1950s illustration style, textured paper grain, warm faded colors, fine art print', category: 'Poster', tags: ['retro', 'travel'], models: ['gpt-image-2'], rank: 6600, ratio: '3:4' },
  { prompt: '3D render of a cute robotic cat made of glossy translucent resin, studio lighting, pastel palette, octane render, toy photography, soft shadows', category: 'Illustration & 3D', tags: ['3d', 'cute'], models: ['gpt-image-2'], rank: 8400, ratio: '1:1' },
  { prompt: 'Digital illustration of a samurai fox spirit in a moonlit bamboo forest, ukiyo-e meets modern anime, intricate linework, rich indigo and gold palette', category: 'Illustration & 3D', tags: ['anime', 'fox'], models: ['midjourney'], rank: 8200, ratio: '3:4' },
  { prompt: 'Low-poly isometric city block at dusk with glowing windows and tiny trees, stylized game art, clean geometry, soft gradients', category: 'Illustration & 3D', tags: ['isometric', 'game art'], models: ['nanobanana'], rank: 7300, ratio: '1:1' },
  { prompt: 'Concept art of a floating sky-island sanctuary with waterfalls falling into clouds, fantasy environment design, painterly, epic viewpoint', category: 'Illustration & 3D', tags: ['fantasy', 'concept art'], models: ['gpt-image-2'], rank: 7800, ratio: '16:9' },
  { prompt: 'Modern SaaS dashboard UI with a dark sidebar, violet accent color, stat cards with sparklines, data table, sleek glassmorphism, figma style', category: 'UI Design', tags: ['dashboard', 'saas'], models: ['gpt-image-2'], rank: 7600, ratio: '16:9' },
  { prompt: 'Mobile banking app UI screens: home, transfers and analytics, neumorphic cards, dark mode with emerald accents, high fidelity, design system', category: 'UI Design', tags: ['mobile', 'fintech'], models: ['nanobanana'], rank: 7100, ratio: '9:16' },
  { prompt: 'Landing page hero section for an AI startup: bold display typography, aurora gradient background, floating product mockup, award-winning web design', category: 'UI Design', tags: ['landing', 'startup'], models: ['gpt-image-2'], rank: 7500, ratio: '16:9' },
  { prompt: 'E-commerce product page UI with large product photography, sticky add-to-cart bar, trust badges, clean whitespace, conversion-focused layout', category: 'UI Design', tags: ['ecommerce'], models: ['gpt-image-2'], rank: 6900, ratio: '16:9' },
  { prompt: 'Cinematic video still of a lone cyclist riding through misty pine forest at dawn, volumetric light rays, anamorphic lens flare, 35mm film look', category: 'Video', tags: ['cinematic', 'film still'], models: ['seedance'], rank: 8800, ratio: '16:9' },
  { prompt: 'Storyboard frame: astronaut planting a flag on Mars with Earth visible in the sky, wide shot, sci-fi realism, dramatic clouds, IMAX scale', category: 'Video', tags: ['storyboard', 'space'], models: ['seedance'], rank: 8000, ratio: '16:9' },
  { prompt: 'Moody night city drone shot looking down a neon-lit street with rain reflections, cyberpunk film scene, anamorphic, teal and magenta grade', category: 'Video', tags: ['drone', 'night'], models: ['seedance'], rank: 7900, ratio: '16:9' },
  { prompt: 'Macro food commercial frame: honey pouring over golden pancakes in slow motion, warm kitchen light, steam rising, delicious food cinematography', category: 'Video', tags: ['food', 'macro'], models: ['seedance'], rank: 7200, ratio: '16:9' },
  { prompt: 'Abstract fluid art wallpaper: molten chrome waves with violet and magenta reflections, ultra detailed, 8k, dark background for desktop', category: 'Wallpaper', tags: ['abstract', '8k'], models: ['gpt-image-2'], rank: 7400, ratio: '16:9' },
  { prompt: 'Minimal gradient landscape wallpaper: layered mountain silhouettes at sunset in soft purple and peach tones, flat design, calm, phone wallpaper', category: 'Wallpaper', tags: ['minimal', 'phone'], models: ['nanobanana'], rank: 6800, ratio: '9:16' },
  { prompt: 'Starfield nebula wallpaper with a distant spiral galaxy, deep space photography style, rich blues and violets, awe inspiring, 4k', category: 'Wallpaper', tags: ['space', '4k'], models: ['gpt-image-2'], rank: 6700, ratio: '16:9' },
  { prompt: 'Geometric dark wallpaper with thin neon violet grid lines receding to a vanishing point, synthwave mood, subtle glow, desktop', category: 'Wallpaper', tags: ['geometric', 'grid'], models: ['gpt-image-2'], rank: 6500, ratio: '16:9' },
  { prompt: 'Brand identity board for a premium chocolate company: logo lockup, color palette of deep brown and gold, packaging concepts, stationery, clean presentation', category: 'Branding', tags: ['identity', 'chocolate'], models: ['gpt-image-2'], rank: 7100, ratio: '4:3' },
  { prompt: 'Minimalist logo concept for a fintech startup: geometric paper-plane mark in indigo on white, scalable, modern, vector style', category: 'Branding', tags: ['logo', 'fintech'], models: ['nanobanana'], rank: 7000, ratio: '1:1' },
  { prompt: 'Social media brand kit: 12 cohesive Instagram post templates for a wellness coach, calming sage palette, consistent typography, template grid', category: 'Branding', tags: ['social', 'templates'], models: ['gpt-image-2'], rank: 6600, ratio: '1:1' },
  { prompt: 'On-brand product shot for a coffee brand: ceramic cup with latte art on a walnut table, warm cozy lighting, rustic chic style, advertising quality', category: 'Branding', tags: ['coffee', 'lifestyle'], models: ['gpt-image-2'], rank: 6400, ratio: '4:5' },
  { prompt: 'Surreal portrait of a woman whose hair morphs into a cascade of origami cranes, studio light, fashion editorial, dreamlike compositing', category: 'Custom', tags: ['surreal', 'editorial'], models: ['gpt-image-2'], rank: 6300, ratio: '2:3' },
  { prompt: 'Tiny terrarium diorama of a miniature garden inside a glass cloche, hyper detailed macro, soft window light, cozy craft aesthetic', category: 'Custom', tags: ['diorama', 'macro'], models: ['nanobanana'], rank: 6100, ratio: '1:1' },
  { prompt: 'Levitation photo of a vintage suitcase floating above a desert dune, sand particles swirling, golden hour, surreal travel photography', category: 'Custom', tags: ['levitation', 'travel'], models: ['gpt-image-2'], rank: 6000, ratio: '3:4' },
  { prompt: 'Steampunk mechanical owl with brass gears and glowing amber eyes, perched on a leather-bound book, dramatic chiaroscuro lighting, detailed illustration', category: 'Custom', tags: ['steampunk', 'owl'], models: ['midjourney'], rank: 5900, ratio: '1:1' },
  { prompt: 'Cozy reading nook by a rainy window: velvet armchair, stacked books, warm lamp glow, cat sleeping on a rug, photoreal interior, hygge mood', category: 'Custom', tags: ['cozy', 'interior'], models: ['gpt-image-2'], rank: 5800, ratio: '4:3' },
  { prompt: 'Macro shot of a dew-covered spider web glowing at sunrise, backlit bokeh, delicate threads, nature photography, ethereal', category: 'Custom', tags: ['macro', 'nature'], models: ['gpt-image-2'], rank: 5700, ratio: '3:4' },
];

function toImageUrl(prompt, seed) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 900))}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
}

async function main() {
  let items = [];
  try {
    items = await fetchRemote();
    console.log(`libreria remota descargada: ${items.length} prompts`);
  } catch (e) {
    console.warn('red no disponible, usando subset curado:', e.message);
  }

  if (!items.length) {
    items = FALLBACK.map((f, i) => ({
      prompt: f.prompt,
      category: f.category,
      tags: f.tags,
      models: f.models,
      imageUrl: toImageUrl(f.prompt, 1000 + i),
      sourceUrl: null,
      engagementRank: f.rank,
      aspectRatio: f.ratio,
    }));
  }

  // * Los aportados por usuarios nunca se tocan.
  const usersCount = await prisma.promptLibrary.count({ where: { isUserSubmitted: true } });
  if (usersCount > 0) console.log(`preservando ${usersCount} prompts aportados por usuarios`);

  let created = 0;
  const existing = new Set(
    (await prisma.promptLibrary.findMany({ select: { slug: true } })).map((p) => p.slug),
  );
  const chunk = [];
  for (const it of items) {
    if (it.prompt.length > 4000) it.prompt = it.prompt.slice(0, 4000);
    const slug = slugify(it.prompt);
    if (existing.has(slug)) continue;
    existing.add(slug);
    chunk.push({
      slug,
      prompt: it.prompt,
      category: CATEGORIES.includes(it.category) ? it.category : 'Custom',
      tags: JSON.stringify(it.tags.slice(0, 6)),
      models: JSON.stringify(it.models.slice(0, 4)),
      aspectRatio: it.aspectRatio || '1:1',
      imageUrl: it.imageUrl,
      sourceUrl: it.sourceUrl,
      engagementRank: it.engagementRank || 0,
    });
    if (chunk.length >= 100) {
      const r = await prisma.promptLibrary.createMany({ data: chunk });
      created += r.count;
      chunk.length = 0;
    }
  }
  if (chunk.length) {
    const r = await prisma.promptLibrary.createMany({ data: chunk });
    created += r.count;
  }

  const total = await prisma.promptLibrary.count();
  console.log(`seed libreria done: ${created} nuevos, ${total} en total (${items.length} procesados).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());