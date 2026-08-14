import type { CSSProperties } from 'react';

export const CATEGORIES = [
  'Portrait',
  'Ads & Product',
  'Poster',
  'Illustration & 3D',
  'UI Design',
  'Video',
  'Wallpaper',
  'Branding',
  'Custom',
] as const;

export const ASPECT_RATIOS = ['1:1', '3:4', '4:5', '16:9', '9:16'] as const;

export const PROVIDER_MODELS: Record<'pollinations' | 'meigen', string[]> = {
  pollinations: ['flux', 'turbo', 'flux-2'],
  meigen: ['gpt-image-2', 'nanobanana-2', 'midjourney-v8.1'],
};

export interface PromptItem {
  id: string;
  prompt: string;
  category: string;
  tags: string;
  models: string;
  aspectRatio: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  engagementRank: number;
  isUserSubmitted: boolean;
  useCount: number;
  createdAt: string;
  isFavorite: boolean;
}

export interface AssetItem {
  id: string;
  prompt: string;
  provider: string;
  model: string;
  seed: number | null;
  url: string;
  width: number;
  height: number;
  sourcePromptId: string | null;
  createdAt: string;
}

export interface GeneratedResult {
  prompt: string;
  url: string;
  width: number;
  height: number;
  model: string;
  seed: number;
  provider: 'pollinations' | 'meigen';
  aspectRatio: string;
}

export function parseAspectRatio(ar: string | null): { w: number; h: number } {
  const m = ar?.trim().match(/^(\d+):(\d+)$/);
  if (!m) return { w: 1, h: 1 };
  const w = parseInt(m[1], 10);
  const h = parseInt(m[2], 10);
  if (!w || !h) return { w: 1, h: 1 };
  return { w, h };
}

export function aspectStyle(ar: string | null): CSSProperties {
  const { w, h } = parseAspectRatio(ar);
  return { aspectRatio: `${w} / ${h}` };
}

export function dimsForAspect(ar: string): { width: number; height: number } {
  switch (ar) {
    case '3:4':
      return { width: 768, height: 1024 };
    case '4:5':
      return { width: 819, height: 1024 };
    case '16:9':
      return { width: 1024, height: 576 };
    case '9:16':
      return { width: 576, height: 1024 };
    default:
      return { width: 1024, height: 1024 };
  }
}

export function enhancePromptLocal(prompt: string): string {
  const p = prompt.trim();
  if (!p) return p;
  const clauses = [
    'shot on 35mm lens with shallow depth of field',
    'soft cinematic lighting, volumetric light, subtle film grain',
    'high dynamic range, rich texture detail, moody atmosphere',
  ];
  const sep = /[.!?]\s*$/.test(p) ? ' ' : '. ';
  return `${p}${sep}${clauses.join(', ')}`;
}

export function parseList(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
