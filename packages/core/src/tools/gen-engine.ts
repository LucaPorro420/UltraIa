//! Gen-Engine client — self-hosted video/music generation.
// Connects to gen-engine/ (FastAPI on GEN_ENGINE_URL, default :8100).
// Health-checks on boot; falls back to keyless providers (Pollinations,
// Tunetank) when the engine is unavailable. Registers as video/music provider.
import type { VideoClip, VideoProvider } from './video';
import type { MusicTrack, MusicProvider } from './music';
import { setMusicProvider } from './music';
import { setVideoProvider } from './video';

/**
 * Cliente del Gen-Engine self-hosted (gen-engine/, FastAPI).
 * Usa GEN_ENGINE_URL (p.ej. http://localhost:8100 o el pod GPU cloud).
 * El default es :8100 para NO colisionar con el webhook server (:8000).
 * Cualquier fallo de red degrada a keyless desde generateVideo/generateMusic.
 */
const GEN_ENGINE_URL = process.env.GEN_ENGINE_URL || 'http://localhost:8100';

async function genEnginePost(
  path: string,
  body: Record<string, unknown>,
  baseUrl: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`gen-engine ${path} -> ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

/** Provider de video real que delega en el Gen-Engine (LTX-2.3 en GPU, storyboard en CPU). */
export function genEngineVideoProvider(baseUrl = GEN_ENGINE_URL): VideoProvider {
  return {
    name: 'gen-engine',
    async generate(prompt, opts) {
      const res = await genEnginePost(
        '/generate/video',
        {
          prompt,
          frames: opts?.frames ?? 3,
          duration_sec: opts?.durationSec ?? 5,
          provider: 'auto',
        },
        baseUrl,
      );
      const frames = Array.isArray(res.frames) ? (res.frames as string[]) : [];
      const url = typeof res.url === 'string' ? res.url : frames[0];
      if (!url) throw new Error('gen-engine video: sin url en la respuesta');
      return {
        kind: 'video',
        prompt,
        url: url.startsWith('/') ? `${baseUrl}${url}` : url,
        provider: String(res.provider || 'gen-engine'),
      };
    },
  };
}

/** Provider de música real que delega en el Gen-Engine (ACE-Step en GPU). */
export function genEngineMusicProvider(baseUrl = GEN_ENGINE_URL): MusicProvider {
  return {
    name: 'gen-engine',
    async generate(prompt, opts) {
      const res = await genEnginePost(
        '/generate/music',
        {
          prompt,
          duration_sec: opts?.durationSec ?? 30,
          provider: 'auto',
        },
        baseUrl,
      );
      const url = typeof res.url === 'string' ? res.url : undefined;
      if (!url) throw new Error('gen-engine music: sin url en la respuesta');
      return {
        kind: 'audio',
        prompt,
        url: url.startsWith('/') ? `${baseUrl}${url}` : url,
        provider: String(res.provider || 'gen-engine'),
      };
    },
  };
}

/** TTS multilingüe vía Gen-Engine (edge-tts). Devuelve la URL del MP3 o null si no hay engine. */
export async function genEngineTts(
  text: string,
  language: string,
  baseUrl = GEN_ENGINE_URL,
): Promise<string | null> {
  try {
    const res = await genEnginePost('/generate/tts', { text, language }, baseUrl);
    const url = typeof res.url === 'string' ? res.url : null;
    if (!url) return null;
    return url.startsWith('/') ? `${baseUrl}${url}` : url;
  } catch {
    return null;
  }
}

/**
 * Activa los providers del Gen-Engine (video + música) solo si el engine
 * responde `/health`. Sin cambios si no responde: la pipeline sigue keyless
 * (Tunetank para música, storyboard para video). Idempotente.
 */
export async function registerGenEngineIfHealthy(
  opts: { url?: string; timeoutMs?: number } = {},
): Promise<boolean> {
  const baseUrl = opts.url ?? GEN_ENGINE_URL;
  try {
    const res = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(opts.timeoutMs ?? 3000),
    });
    if (!res.ok) return false;
    setMusicProvider(genEngineMusicProvider(baseUrl));
    setVideoProvider(genEngineVideoProvider(baseUrl));
    return true;
  } catch {
    return false;
  }
}