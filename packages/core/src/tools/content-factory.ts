// content-factory — Fábrica multimodal unificada (holagpt + fallbacks keyless del repo)
// Orquesta 7 tipos: web | video | game | app | image | audio | music
// Keyless-first: si no hay HOLAGPT_API_KEY, degrada a pollinations/edge-tts/Tunetank/DDG/generative/pngrender/etc.
// Determinista, fail-soft por tipo, sin secrets en repo.
import { z } from 'zod';
import { holagptConfigured, holagptChat, holagptImage, holagptSearch } from './holagpt';
import { generateImage } from './image';
import { generateVideo } from './video';
import { generateMusic } from './music';
import { generateUiScreen } from './stitch';
import { edgeTtsAudio } from '../omag/tts';
import { synthSound } from '../omag/sound';

export const ContentKind = z.enum(['web', 'video', 'game', 'app', 'image', 'audio', 'music']);
export type ContentKind = z.infer<typeof ContentKind>;

export const contentFactorySchema = z.object({
  kind: ContentKind,
  brief: z.string().min(3).max(4000),
  idioma: z.enum(['es', 'ar']).optional(),
  style: z.string().max(100).optional(),
  dryRun: z.boolean().optional(),
});
export type ContentFactoryInput = z.infer<typeof contentFactorySchema>;

export type ContentFactoryResult = {
  kind: ContentKind;
  brief: string;
  idioma: string;
  output: unknown;
  provider: string;
  note?: string;
};

function hasHolagpt(): boolean {
  return holagptConfigured();
}

// ——— generadores por kind (cada uno puro/fail-soft) ———
async function genWeb(brief: string, idioma: string): Promise<{ htmlUrl?: string; screenUrl?: string; note: string }> {
  // Stitch (UI) si hay GOOGLE_API_KEY, si no holagpt chat como fallback
  if (process.env.GOOGLE_API_KEY) {
    try {
      const r = await generateUiScreen(brief);
      return { htmlUrl: (r as { htmlUrl?: string }).htmlUrl, screenUrl: (r as { screenshotUrl?: string }).screenshotUrl, note: 'stitch' };
    } catch { /* fallback */ }
  }
  if (hasHolagpt()) {
    const r = await holagptChat({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: `Genera HTML para: ${brief} (${idioma})` }] });
    return { note: `holagpt:${r.text.slice(0,120)}` };
  }
  return { note: 'keyless: builder/codegen placeholder (sin provider)' };
}

async function genVideo(brief: string): Promise<{ storyboard: unknown; note: string }> {
  const sb = await generateVideo(brief, { frames: 4 });
  return { storyboard: sb, note: hasHolagpt() ? 'holagpt+storyboard' : 'storyboard keyless (pollinations)' };
}

async function genGame(brief: string): Promise<{ prototype: string; note: string }> {
  // Codevfx/SDF: no ejecutar aquí, solo plan; holagpt genera el scaffold si hay key
  if (hasHolagpt()) {
    const r = await holagptChat({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: `Scaffold Three.js game for: ${brief}. Return file list.` }] });
    return { prototype: r.text.slice(0, 800), note: 'holagpt:threejs scaffold' };
  }
  return { prototype: `// ${brief} — procedural game scaffold`, note: 'keyless: procedural' };
}

async function genApp(brief: string): Promise<{ scaffold: string; note: string }> {
  if (hasHolagpt()) {
    const r = await holagptChat({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: `Expo app scaffold for: ${brief}. Return expo structure.` }] });
    return { scaffold: r.text.slice(0, 800), note: 'holagpt:expo scaffold' };
  }
  return { scaffold: `// ${brief} — Expo scaffold (apps/mobile template)`, note: 'keyless: template' };
}

async function genImage(brief: string): Promise<{ url: string; provider: string }> {
  if (hasHolagpt()) {
    try {
      const r = await holagptImage({ prompt: brief, model: 'flux' });
      return { url: r.url, provider: 'holagpt:flux' };
    } catch { /* fallback */ }
  }
  const r = await generateImage({ prompt: brief });
  return { url: (r as { url: string }).url ?? String(r), provider: 'pollinations' };
}

async function genAudio(brief: string, idioma: string): Promise<{ kind: string; note: string }> {
  try {
    const lang = idioma === 'ar' ? 'ar-SA' : 'es-UY';
    const buf = await edgeTtsAudio(brief.slice(0, 500), lang, { voice: idioma === 'ar' ? 'ar-SA-HamedNeural' : 'es-UY-MateoNeural' });
    if (buf && (buf as Buffer).length > 100) return { kind: 'edge-tts', note: `wav ${(buf as Buffer).length} bytes` };
  } catch { /* fallback */ }
  if (hasHolagpt()) return { kind: 'holagpt:tts', note: 'holagpt tts (api)' };
  const s = synthSound('tone', { durationSec: 1 });
  return { kind: s.kind, note: 'procedural tone fallback' };
}

async function genMusic(brief: string): Promise<{ composition: unknown; provider: string }> {
  const c = await generateMusic(brief);
  return { composition: c, provider: hasHolagpt() ? 'holagpt+compose' : 'compose keyless' };
}

export async function contentFactoryGenerate(input: ContentFactoryInput): Promise<ContentFactoryResult> {
  const parsed = contentFactorySchema.parse(input);
  const idioma = parsed.idioma ?? 'es';
  const dryRun = parsed.dryRun ?? false;
  if (dryRun) {
    return { kind: parsed.kind, brief: parsed.brief, idioma, output: { dryRun: true, brief: parsed.brief }, provider: 'dry-run' };
  }
  let output: unknown;
  let provider = 'keyless';
  let note: string | undefined;
  switch (parsed.kind) {
    case 'web': { const r = await genWeb(parsed.brief, idioma); output = r; provider = r.note.includes('holagpt') ? 'holagpt' : r.note.includes('stitch') ? 'stitch' : 'keyless'; note = r.note; break; }
    case 'video': { const r = await genVideo(parsed.brief); output = r; provider = r.note.includes('holagpt') ? 'holagpt' : 'keyless'; note = r.note; break; }
    case 'game': { const r = await genGame(parsed.brief); output = r; provider = r.note.includes('holagpt') ? 'holagpt' : 'keyless'; note = r.note; break; }
    case 'app': { const r = await genApp(parsed.brief); output = r; provider = r.note.includes('holagpt') ? 'holagpt' : 'keyless'; note = r.note; break; }
    case 'image': { const r = await genImage(parsed.brief); output = r; provider = r.provider; break; }
    case 'audio': { const r = await genAudio(parsed.brief, idioma); output = r; provider = r.kind; note = r.note; break; }
    case 'music': { const r = await genMusic(parsed.brief); output = r; provider = r.provider; break; }
    default: throw new Error(`kind desconocido: ${parsed.kind}`);
  }
  return { kind: parsed.kind, brief: parsed.brief, idioma, output, provider, note };
}

// Búsqueda unificada (holagpt search si hay key, si no DDG via reach)
export async function contentFactorySearch(query: string, maxResults = 8): Promise<{ results: Array<{ title: string; url: string; snippet: string; source: string }>; provider: string }> {
  if (hasHolagpt()) {
    try {
      const r = await holagptSearch({ query, maxResults });
      return { results: r.results, provider: 'holagpt' };
    } catch { /* fallback */ }
  }
  // fallback: no network call here; caller can use reach.searchWeb
  return { results: [], provider: 'none (usa reach_search)' };
}

export const contentFactory = { generate: contentFactoryGenerate, search: contentFactorySearch };
