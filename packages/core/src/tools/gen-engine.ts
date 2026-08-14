import type { VideoClip, VideoProvider } from './video';
import type { MusicTrack, MusicProvider } from './music';

/**
 * Cliente del Gen-Engine self-hosted (gen-engine/, FastAPI).
 * Usa GEN_ENGINE_URL (p.ej. http://localhost:8000 o el pod GPU cloud).
 * Cualquier fallo de red degrada a keyless desde generateVideo/generateMusic.
 */
const GEN_ENGINE_URL = process.env.GEN_ENGINE_URL || 'http://localhost:8000';

async function genEnginePost(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${GEN_ENGINE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`gen-engine ${path} -> ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

/** Provider de video real que delega en el Gen-Engine (LTX-2.3 en GPU, storyboard en CPU). */
export function genEngineVideoProvider(): VideoProvider {
  return {
    name: 'gen-engine',
    async generate(prompt, opts) {
      const res = await genEnginePost('/generate/video', {
        prompt,
        frames: opts?.frames ?? 3,
        duration_sec: opts?.durationSec ?? 5,
        provider: 'auto',
      });
      const frames = Array.isArray(res.frames) ? (res.frames as string[]) : [];
      const url = typeof res.url === 'string' ? res.url : frames[0];
      if (!url) throw new Error('gen-engine video: sin url en la respuesta');
      return {
        kind: 'video',
        prompt,
        url: url.startsWith('/') ? `${GEN_ENGINE_URL}${url}` : url,
        provider: String(res.provider || 'gen-engine'),
      };
    },
  };
}

/** Provider de música real que delega en el Gen-Engine (ACE-Step en GPU). */
export function genEngineMusicProvider(): MusicProvider {
  return {
    name: 'gen-engine',
    async generate(prompt, opts) {
      const res = await genEnginePost('/generate/music', {
        prompt,
        duration_sec: opts?.durationSec ?? 30,
        provider: 'auto',
      });
      const url = typeof res.url === 'string' ? res.url : undefined;
      if (!url) throw new Error('gen-engine music: sin url en la respuesta');
      return {
        kind: 'audio',
        prompt,
        url: url.startsWith('/') ? `${GEN_ENGINE_URL}${url}` : url,
        provider: String(res.provider || 'gen-engine'),
      };
    },
  };
}

/** TTS multilingüe vía Gen-Engine (edge-tts). Devuelve la URL del MP3 o null si no hay engine. */
export async function genEngineTts(text: string, language: string): Promise<string | null> {
  try {
    const res = await genEnginePost('/generate/tts', { text, language });
    const url = typeof res.url === 'string' ? res.url : null;
    if (!url) return null;
    return url.startsWith('/') ? `${GEN_ENGINE_URL}${url}` : url;
  } catch {
    return null;
  }
}