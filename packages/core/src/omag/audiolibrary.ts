/**
 * AudioLibrary — search, save and sample audio assets for UltraIa OMAG.
 *
 * Sources:
 *  - Tunetank MCP (searchMusic/searchSfx, keyless) → download MP3s to disk.
 *  - Local sample folder (pre-loaded audio) → list/search by name.
 *  - Extract audio from a video URL (sampler). Requires ffmpeg (and yt-dlp for
 *    most video hosts); degrades with a clear guide when they're unavailable.
 *  - Procedural synthesis (sound.ts) as a zero-dependency fallback.
 */

import { searchMusic, searchSfx } from '../tools/content';
import { encodeWav, synthSound, type SynthResult } from './sound';

export interface AudioLibraryOptions {
  /** Directory for downloaded/saved audio. Default: apps/web/public/assets/audio. */
  dir?: string;
}

export interface SavedSample {
  name: string;
  path: string;
  source: string;
}

export interface SearchSampleInput {
  query: string;
  kind?: 'music' | 'sfx';
  maxResults?: number;
}

export interface SearchSampleResult {
  query: string;
  items: Array<{ id: number; name: string; url: string; duration: number }>;
}

/** In-memory registry of "pre-loaded" sample metadata (id → name). */
export interface PreloadedSample {
  id: string;
  name: string;
}

export class AudioLibrary {
  private readonly dir: string;
  private preloaded: PreloadedSample[] = [];

  constructor(opts: AudioLibraryOptions = {}) {
    this.dir =
      opts.dir ??
      (process.env.ULTRAIA_AUDIO_DIR ??
        'apps/web/public/assets/audio');
  }

  /** Register pre-loaded samples available in the library folder. */
  registerPreloaded(samples: PreloadedSample[]): void {
    this.preloaded = [...samples];
  }

  listPreloaded(): PreloadedSample[] {
    return [...this.preloaded];
  }

  findPreloaded(query: string): PreloadedSample[] {
    const q = query.toLowerCase();
    return this.preloaded.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
    );
  }

  /** Search royalty-free audio (Tunetank MCP). Single-word fallback built-in. */
  async search(input: SearchSampleInput): Promise<SearchSampleResult> {
    const query = (input.query || '').trim();
    if (!query) throw new Error('Query is required');
    const maxResults = input.maxResults ?? 6;
    if ((input.kind ?? 'music') === 'sfx') {
      const res = await searchSfx({ query, maxResults });
      return {
        query,
        items: res.sfx.map((s) => ({ id: s.id, name: s.name, url: s.preview, duration: s.duration })),
      };
    }
    const res = await searchMusic({ query, maxResults });
    return {
      query,
      items: res.tracks.map((t) => ({ id: t.id, name: t.name, url: t.preview, duration: t.duration })),
    };
  }

  /**
   * Download an audio URL and save it to the library folder as `<name>.mp3`.
   * Returns the saved path (or null if the download fails / fs unavailable).
   */
  async saveSample(url: string, name: string): Promise<SavedSample | null> {
    const safeName = name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const { writeFileSync, mkdirSync } = await import(/* webpackIgnore: true */ 'node:fs');
      mkdirSync(this.dir, { recursive: true });
      const path = `${this.dir}/${safeName}.mp3`;
      writeFileSync(path, buf);
      return { name: safeName, path, source: url };
    } catch {
      return null;
    }
  }

  /**
   * Extract the audio track from a video URL (sampler).
   * Requires ffmpeg; most hosts additionally need yt-dlp. Degrades gracefully.
   */
  async extractAudioFromVideo(url: string, name: string): Promise<SavedSample> {
    const { execFile } = await import(/* webpackIgnore: true */ 'node:child_process');
    const { mkdirSync } = await import(/* webpackIgnore: true */ 'node:fs');
    mkdirSync(this.dir, { recursive: true });
    const safeName = name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    const out = `${this.dir}/${safeName}.mp3`;

    const has = (cmd: string): Promise<boolean> =>
      new Promise((resolve) => {
        execFile(cmd, ['-version'], { timeout: 5000 }, (err) => resolve(!err));
      });

    const run = (cmd: string, args: string[]): Promise<void> =>
      new Promise((resolve, reject) => {
        execFile(cmd, args, { timeout: 120_000, windowsHide: true }, (err) => (err ? reject(err) : resolve()));
      });

    const hasFfmpeg = await has('ffmpeg');
    const hasYtdlp = await has('yt-dlp');
    if (!hasFfmpeg) {
      throw new Error(
        `extractAudioFromVideo needs ffmpeg. Install with:\n  winget install Gyan.FFmpeg`,
      );
    }

    try {
      // For remote URLs prefer yt-dlp (handles hosts/streams); otherwise ffmpeg.
      if (url.startsWith('http') && hasYtdlp) {
        try {
          await run('yt-dlp', ['-x', '--audio-format', 'mp3', '-o', out, url]);
          return { name: safeName, path: out, source: url };
        } catch {
          /* fall through to ffmpeg */
        }
      }
      await run('ffmpeg', ['-y', '-i', url, '-vn', '-ac', '1', '-ar', '44100', out]);
      return { name: safeName, path: out, source: url };
    } catch {
      throw new Error(
        `Could not extract audio from the video. If it's a remote URL, install yt-dlp:\n` +
          `  pip install yt-dlp`,
      );
    }
  }

  /**
   * Synthesize a procedural sound from nothing (no network, no ffmpeg) and save
   * it as WAV in the library folder.
   */
  async saveSynth(kind: string, name: string, opts?: { durationSec?: number; freq?: number }): Promise<SynthResult> {
    const result = synthSound(kind, opts);
    const buf = encodeWav(result);
    const { writeFileSync, mkdirSync } = await import(/* webpackIgnore: true */ 'node:fs');
    mkdirSync(this.dir, { recursive: true });
    const safeName = name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    writeFileSync(`${this.dir}/${safeName}.wav`, buf);
    return result;
  }
}

export const audioLibrary = new AudioLibrary();