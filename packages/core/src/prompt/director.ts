import type { AiGateway } from '../ai/gateway';
import { LANGUAGES, languageInfo, normalizeLanguage } from './languages';

/** Plan estructurado que el director produce desde lenguaje natural. */
export interface DirectorPlan {
  language: string;
  languageName: string;
  script: string; // guion narrado en el idioma destino
  images: string[]; // prompts de imagen (1 por shot, en inglés para el modelo)
  shots: number;
  motion: string; // zoom-in | zoom-out | pan-left | pan-right | pan-up | pan-down
  bgm: string; // descripción de música de fondo
  style: string; // estilo visual (cinematic, 3d render...)
}

const MOTIONS = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down'] as const;

export const DIRECTOR_SYSTEM_PROMPT = (languages = LANGUAGES.map((l) => l.name)): string => `
You are the Multimodal Director of UltraIa. You translate a natural-language request (in ANY of these languages: ${languages.join(', ')}) into a strict JSON media plan.

Rules:
- Detect the request language; ALWAYS write the narration script in that language.
- Write image prompts in English (the image model understands English best), one per shot (3-6 shots).
- Pick a camera motion for each shot from: ${MOTIONS.join(', ')}.
- Describe background music (instrumentation, tempo, mood) in the request language.
- Output ONLY valid JSON with exactly these keys:
  {"language": "<BCP-47 code>", "script": "...", "images": ["..."], "shots": <int>,
   "motion": "<one of the motions>", "bgm": "...", "style": "..."}
`;

/** Parsea el JSON del modelo tolerando markdown fences y ruido. */
export function parseDirectorPlan(raw: string): DirectorPlan {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/m, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Director output is not JSON');
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<DirectorPlan>;
  if (!parsed.script || !Array.isArray(parsed.images) || !parsed.images.length) {
    throw new Error('Director output missing script/images');
  }
  const language = normalizeLanguage(parsed.language);
  return {
    language,
    languageName: languageInfo(language).name,
    script: parsed.script,
    images: parsed.images.slice(0, 8),
    shots: Math.min(Math.max(parsed.shots ?? parsed.images.length, 1), 8),
    motion: MOTIONS.includes(parsed.motion as (typeof MOTIONS)[number])
      ? (parsed.motion as string)
      : 'zoom-in',
    bgm: parsed.bgm ?? '',
    style: parsed.style ?? 'cinematic',
  };
}

/** Adaptador determinista (sin LLM): plan básico desde un prompt en cualquier idioma. */
export function buildLocalPlan(prompt: string): DirectorPlan {
  const language = normalizeLanguage(prompt);
  const info = languageInfo(language);
  return {
    language,
    languageName: info.name,
    script: prompt,
    images: [prompt],
    shots: 1,
    motion: 'zoom-in',
    bgm: '',
    style: 'cinematic',
  };
}

/**
 * Adaptador de lenguaje natural multilingüe → DirectorPlan.
 * Usa el LLM configurado si hay gateway; si no, plan determinista local.
 */
export async function adaptToMediaPlan(
  prompt: string,
  opts?: { gateway?: AiGateway; model?: string },
): Promise<DirectorPlan> {
  if (!opts?.gateway) return buildLocalPlan(prompt);
  try {
    const text = await opts.gateway.chatText({
      system: DIRECTOR_SYSTEM_PROMPT(),
      input: prompt,
      model: opts.model,
    });
    return parseDirectorPlan(text);
  } catch {
    return buildLocalPlan(prompt);
  }
}

export { LANGUAGES, normalizeLanguage, languageInfo, detectLanguage } from './languages';