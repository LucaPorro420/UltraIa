export interface MusicSection {
  name: string;
  description: string;
  lyrics?: string;
  notation?: string;
}

export interface MusicComposition {
  kind: 'composition';
  prompt: string;
  title: string;
  mood: string;
  genre: string;
  key: string;
  tempoBpm: number;
  sections: MusicSection[];
  productionNotes: string;
  note: string;
}

export interface MusicTrack {
  kind: 'audio';
  prompt: string;
  url: string;
  provider: string;
}

export type MusicResult = MusicComposition | MusicTrack;

/**
 * A pluggable provider for real music/audio generation. Implement this and
 * register it via `setMusicProvider` to enable actual audio output (e.g. a
 * free-tier MusicGen/SUNO-class endpoint). Until then, UltraIa returns a
 * structured, ready-to-render composition (keyless).
 */
export interface MusicProvider {
  name: string;
  generate(prompt: string, opts?: { durationSec?: number }): Promise<MusicTrack>;
}

let musicProvider: MusicProvider | null = null;
export function setMusicProvider(p: MusicProvider | null): void {
  musicProvider = p;
}

const GENRES = ['ambient', 'lo-fi', 'cinematic orchestral', 'synthwave', 'acoustic', 'techno', 'pop'];
const MOODS = ['calm', 'uplifting', 'tense', 'epic', 'melancholic', 'playful', 'mysterious'];
const KEYS = ['C minor', 'A minor', 'E major', 'G major', 'D minor', 'F major', 'Bb major'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Keyless music output: a complete, structured composition (title, mood, key,
 * tempo, sections with lyrics/notation, production notes) that a human or a
 * downstream audio model can realize. Default when no MusicProvider is set.
 */
export async function composeMusic(prompt: string): Promise<MusicComposition> {
  const p = (prompt || '').trim() || 'an original piece';
  const genre = pick(GENRES);
  const mood = pick(MOODS);
  const key = pick(KEYS);
  const tempo = 70 + Math.floor(Math.random() * 80);

  const sections: MusicSection[] = [
    { name: 'Intro', description: `Sparse ${mood} ${genre} bed in ${key}, building atmosphere.` },
    {
      name: 'Verse',
      description: `Main theme enters, ${mood} and clear.`,
      lyrics: `(${p}) — verse line inspired by the brief`,
      notation: `${key}, 4/4, verse motif`,
    },
    {
      name: 'Chorus',
      description: `Full arrangement, hook-led and ${mood}.`,
      lyrics: `(${p}) — memorable chorus`,
      notation: `${key}, lift dynamics`,
    },
    { name: 'Bridge', description: `Contrast section, harmonic shift, then resolve.` },
    { name: 'Outro', description: `Fade with the intro motif.` },
  ];

  return {
    kind: 'composition',
    prompt: p,
    title: p.slice(0, 60).replace(/\b\w/g, (c) => c.toUpperCase()),
    mood,
    genre,
    key,
    tempoBpm: tempo,
    sections,
    productionNotes: `Mix: wide stereo, ${mood} reverb tail, sidechained pads. Reference: modern ${genre} with a ${mood} feel.`,
    note: 'Keyless composition. Configure a MusicProvider for rendered audio.',
  };
}

export async function generateMusic(prompt: string, opts?: { durationSec?: number }): Promise<MusicResult> {
  if (musicProvider) {
    return musicProvider.generate(prompt, opts);
  }
  return composeMusic(prompt);
}
