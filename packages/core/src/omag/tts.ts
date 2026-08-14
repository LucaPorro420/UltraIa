/**
 * Keyless text-to-speech for UltraIa OMAG — Microsoft Edge TTS.
 *
 * Verified live 2026-08-14: edge-tts is free, no API key, returns an MP3.
 * Voice map ported from the CreationsApp ar-SA pipeline (ULTRAIA/.../audio.py),
 * which verified these voices across 14 languages.
 */

/** edge-tts voices per BCP-47 language code. */
export const VOICES_BY_LANG: Record<string, string> = {
  ar: 'ar-SA-HamedNeural',
  es: 'es-ES-ElviraNeural',
  en: 'en-US-JennyNeural',
  fr: 'fr-FR-DeniseNeural',
  pt: 'pt-BR-FranciscaNeural',
  de: 'de-DE-KatjaNeural',
  it: 'it-IT-ElsaNeural',
  ja: 'ja-JP-NanamiNeural',
  zh: 'zh-CN-XiaoxiaoNeural',
  hi: 'hi-IN-SwaraNeural',
  ru: 'ru-RU-SvetlanaNeural',
  nl: 'nl-NL-FennaNeural',
  tr: 'tr-TR-EmelNeural',
  pl: 'pl-PL-ZofiaNeural',
};

export const DEFAULT_LANG = 'es';
export const DEFAULT_VOICE = VOICES_BY_LANG[DEFAULT_LANG];

export interface TtsOutput {
  url: string | null;
  script: string;
  voice: string;
  lang: string;
  /** Present only when edge-tts is reachable. */
  audio?: boolean;
}

export interface EdgeTtsOptions {
  /** Rate/speed, e.g. '+0%' or '-10%'. */
  rate?: string;
  /** Pitch, e.g. '+0Hz'. */
  pitch?: string;
  /** Voice to use; defaults to the language's voice. */
  voice?: string;
}

/** Weak, cheap language detection from a script (no dependency). */
export function detectLang(script: string): string {
  const s = (script || '').toLowerCase();
  const arabic = /[\u0600-\u06FF]/.test(s);
  if (arabic) return 'ar';
  const zh = /[\u4E00-\u9FFF]/.test(s);
  if (zh) return 'zh';
  const ja = /[\u3040-\u30FF]/.test(s);
  if (ja) return 'ja';
  const kana = /[\uAC00-\uD7AF]/.test(s);
  if (kana) return 'ko';
  const de = /[äöüß]/.test(s) && /\b(die|der|und|ich|nicht)\b/i.test(s);
  if (de) return 'de';
  const frWords = /\b(une|les|dans|avec|sur|est|des|pour|pas|mais)\b/i.test(s);
  const frAccents = /[àâçéèêëîïôûùœ]/.test(s);
  if (frWords && (frAccents || /\b(une|dans|avec|sur|est|des|pour|pas)\b/i.test(s))) return 'fr';
  const pt = /[ãõçáéíóúâêô]/.test(s) && /\b(um|uma|não|para|com)\b/i.test(s);
  if (pt) return 'pt';
  const it = /\b(il|la|gli|un|uno|che|e)\b/i.test(s) && /[àèìòù]/.test(s);
  if (it) return 'it';
  const es = /[áéíóúñ¿¡]/.test(s) && /\b(una|los|para|con|que|como)\b/i.test(s);
  if (es) return 'es';
  const en = /\b(the|and|of|to|with|this|that|is)\b/i.test(s);
  if (en) return 'en';
  return DEFAULT_LANG;
}

export function voiceFor(lang: string): string {
  const key = (lang || '').split('-')[0].toLowerCase();
  return VOICES_BY_LANG[key] ?? DEFAULT_VOICE;
}

/** Extract the voice id from an edge-tts WebSocket Connect message payload. */
function parseSsmlVoice(ssml: string): string {
  const m = /<voice name="([^"]+)">/.exec(ssml);
  return m ? m[1] : '';
}

/**
 * Call the Microsoft Edge TTS WebSocket and collect the MP3 audio.
 * Keyless, free, 100+ voices. Returns the MP3 as a Buffer (or null on failure).
 * Uses the global WebSocket (Node 22+ / browsers); no `ws` dependency needed.
 */
export async function edgeTtsAudio(
  script: string,
  lang: string,
  opts: EdgeTtsOptions = {},
): Promise<Buffer | null> {
  const voice = opts.voice ?? voiceFor(lang);
  if (typeof WebSocket === 'undefined') return null;
  const text = (script || '').trim();
  if (!text) return null;

  const audioChunks: Buffer[] = [];
  return await new Promise<Buffer | null>((resolve) => {
    let client: WebSocket | null = null;
    let settled = false;
    const finish = (buf: Buffer | null) => {
      if (settled) return;
      settled = true;
      try {
        client?.close();
      } catch {
        /* ignore */
      }
      resolve(buf);
    };

    try {
      client = new WebSocket('wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4');
    } catch {
      finish(null);
      return;
    }

    const timeout = setTimeout(() => finish(null), 20_000);

    client.addEventListener('open', () => {
      const msg = {
        context: { synthesis: { audio: { metadataoptions: { sentenceBoundaryEnabled: 'false' }, outputFormat: 'audio-24khz-48kbitrate-mono-mp3' } } },
        version: '1.0.0',
        name: 'Microsoft Speech Service',
      };
      client?.send(
        `X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify(msg)}`,
      );
      const ssml = [
        `<speak version='1.0' xml:lang='${lang}'>`,
        `<voice name='${voice}'>`,
        `<prosody pitch='${opts.pitch ?? '+0Hz'}' rate='${opts.rate ?? '+0%'}'>`,
        `<break time='100ms'/>${text}<break time='100ms'/>`,
        '</prosody>',
        '</voice>',
        '</speak>',
      ].join('');
      client?.send(
        `X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`,
      );
    });

    client.addEventListener('message', (ev: MessageEvent) => {
      const data = ev.data as unknown;
      const buf =
        typeof data === 'string'
          ? Buffer.from(data)
          : data instanceof ArrayBuffer
            ? Buffer.from(data)
            : ArrayBuffer.isView(data)
              ? Buffer.from(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength)
              : null;
      if (!buf) return;
      const headerEnd = buf.indexOf('\n\n');
      if (headerEnd === -1) return;
      const header = buf.slice(0, headerEnd).toString('utf8');
      const body = buf.slice(headerEnd + 2);
      if (header.includes('Path:audio')) {
        audioChunks.push(body);
      } else if (header.includes('Path:turn.end')) {
        clearTimeout(timeout);
        finish(audioChunks.length ? Buffer.concat(audioChunks) : null);
      }
    });

    client.addEventListener('error', () => finish(null));
    client.addEventListener('close', () => finish(audioChunks.length ? Buffer.concat(audioChunks) : null));
  });
}

export interface PersistAudioOptions {
  /** Where to write the file. If omitted, returns a data URL instead. */
  filePath?: string;
}

/**
 * Synthesize narration and return a serializable result.
 * If a filePath is provided (and fs is available) the MP3 is written to disk
 * and `url` is the file path; otherwise `url` is a base64 data URL.
 */
export async function edgeTts(
  script: string,
  opts: EdgeTtsOptions & PersistAudioOptions = {},
): Promise<TtsOutput> {
  const lang = detectLang(script);
  const voice = opts.voice ?? voiceFor(lang);
  const audio = await edgeTtsAudio(script, lang, { ...opts, voice });
  const scriptTrimmed = (script || '').trim();
  if (!audio) {
    return { url: null, script: scriptTrimmed, voice, lang, audio: false };
  }
  let url: string;
  if (opts.filePath) {
    try {
      const fs = await import(/* webpackIgnore: true */ 'node:fs');
      fs.mkdirSync(require_node_dirname(opts.filePath), { recursive: true });
      fs.writeFileSync(opts.filePath, audio);
      url = opts.filePath;
    } catch {
      url = `data:audio/mpeg;base64,${audio.toString('base64')}`;
    }
  } else {
    url = `data:audio/mpeg;base64,${audio.toString('base64')}`;
  }
  return { url, script: scriptTrimmed, voice, lang, audio: true };
}

/** Minimal dirname util (avoids importing node:path in the core bundle). */
function require_node_dirname(filePath: string): string {
  const idx = filePath.lastIndexOf('/');
  const idxB = filePath.lastIndexOf('\\');
  const cut = Math.max(idx, idxB);
  return cut === -1 ? '.' : filePath.slice(0, cut);
}

export { parseSsmlVoice };