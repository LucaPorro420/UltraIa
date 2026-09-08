/**
 * Learning System Domain — entidades puras (Clean Arch).
 * Zero deps externas salvo zod. SM-2 para SRS, validación bilingüe, índices de búsqueda.
 * Parte de C1 FutureMindMy: primer dominio migrado.
 */
import { z } from "zod";

// ---------- Value Objects ----------
export const SlugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug debe ser kebab-case a-z0-9-");

export type Slug = z.infer<typeof SlugSchema>;

export function validateSlug(slug: string): { ok: true; value: Slug } | { ok: false; error: string } {
  const res = SlugSchema.safeParse(slug);
  if (res.success) return { ok: true, value: res.data };
  return { ok: false, error: res.error.issues[0]?.message ?? "slug inválido" };
}

// ---------- SM-2 SRS ----------
export interface SrsCard {
  easeFactor: number; // 1.3 - 2.5
  intervalDays: number;
  repetitions: number;
  nextReview: Date;
  lastReviewed?: Date | null;
}

export interface SrsReviewInput {
  quality: number; // 0-5 (0 fail, 5 perfect)
  now?: Date;
}

export interface SrsNext {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReview: Date;
}

const MIN_EASE = 1.3;

/**
 * SM-2 clásico (Wozniak). Determinista, sin deps.
 * quality 0-2 => reset repetitions, interval 0
 * quality 3-5 => increment, ease ajustado
 */
export function calculateNextReview(card: SrsCard, input: SrsReviewInput): SrsNext {
  const quality = Math.max(0, Math.min(5, Math.round(input.quality)));
  const now = input.now ?? new Date();
  let { easeFactor, intervalDays, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 0;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
  }

  // easeFactor = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < MIN_EASE) easeFactor = MIN_EASE;
  // cap to avoid explosion
  if (easeFactor > 2.5) easeFactor = 2.5;

  const nextReview = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return { easeFactor: Number(easeFactor.toFixed(2)), intervalDays, repetitions, nextReview };
}

// Helpers for JSON string fields stored as TEXT (SQLite)
export function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function stringifyJsonArray(arr: string[]): string {
  return JSON.stringify(arr);
}

export function parseJsonObject(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ---------- Bilingual ----------
export const BilingualContentSchema = z.object({
  es: z.string().min(1),
  ar: z.string().optional(),
  en: z.string().optional(),
});

export type BilingualContent = z.infer<typeof BilingualContentSchema>;

export function validateBilingual(content: unknown): { ok: true; value: BilingualContent } | { ok: false; error: string } {
  const res = BilingualContentSchema.safeParse(content);
  if (res.success) return { ok: true, value: res.data };
  return { ok: false, error: res.error.issues[0]?.message ?? "bilingual inválido" };
}

export function bilingualHash(content: string): string {
  // simple hash for contentHash field (not crypto, deterministic)
  let h = 0;
  for (let i = 0; i < content.length; i++) h = (h * 31 + content.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

// ---------- Search Index ----------
export interface SearchDoc {
  type: string;
  sourceId: string;
  title: string;
  content: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

export function buildSearchIndex(doc: SearchDoc) {
  return {
    type: doc.type,
    sourceId: doc.sourceId,
    title: doc.title.slice(0, 200),
    content: doc.content.slice(0, 4000),
    language: doc.language ?? "es",
    metadata: doc.metadata ?? null,
  };
}

// ---------- Course helpers ----------
export const CourseCategorySchema = z.enum([
  "fundamentals",
  "typescript",
  "react",
  "backend",
  "database",
  "ai",
  "agents",
  "omag",
  "multimedia",
  "autopub",
  "cerebro",
  "runtime",
  "devops",
  "markdown",
  "conclusion",
]);

export type CourseCategory = z.infer<typeof CourseCategorySchema>;

export function isCourseCategory(v: string): v is CourseCategory {
  return (CourseCategorySchema.options as string[]).includes(v);
}
