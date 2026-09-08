/**
 * Learning System Tool — capability `learning-system`
 * Dominio puro determinista + adapter Prisma inyectable.
 * Acciones: create_course / list_courses / create_module / list_modules / create_lesson / list_lessons / save_progress / review_card
 * Pattern: publications.ts / briefs.ts (db inyectable via opts.db, fail-soft, no secrets).
 */
import { z } from "zod";
import { calculateNextReview, validateSlug } from "../domain/learning";

// ---------- Schemas ----------
export const CreateCourseSchema = z.object({
  slug: z.string().min(3).max(80),
  title: z.string().min(3).max(120),
  description: z.string().optional(),
  category: z.string().min(2).max(30),
  icon: z.string().optional(),
});

export const CreateModuleSchema = z.object({
  courseId: z.string().min(1),
  slug: z.string().min(2).max(80),
  title: z.string().min(3).max(120),
});

export const CreateLessonSchema = z.object({
  moduleId: z.string().min(1),
  slug: z.string().min(2).max(80),
  title: z.string().min(3).max(120),
  content: z.string().min(10),
});

export const SaveProgressSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
  lessonSlug: z.string().min(1),
});

export const ReviewCardSchema = z.object({
  cardId: z.string().min(1),
  quality: z.number().min(0).max(5),
  easeFactor: z.number().min(1.3).max(2.5).optional(),
  intervalDays: z.number().min(0).max(3650).optional(),
  repetitions: z.number().min(0).max(1000).optional(),
});

// ---------- Types ----------
export type LearningCourseInput = z.infer<typeof CreateCourseSchema>;
export type LearningModuleInput = z.infer<typeof CreateModuleSchema>;
export type LearningLessonInput = z.infer<typeof CreateLessonSchema>;

// ---------- Helpers (pure) ----------
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ---------- DB helpers (injected) ----------
type DbLike = any;

export async function createCourse(db: DbLike, input: LearningCourseInput) {
  if (!db) return { ok: false as const, reason: "db_not_configured" };
  const s = validateSlug(input.slug);
  if (!s.ok) return { ok: false as const, reason: s.error };
  const existing = await db.learningCourse.findUnique({ where: { slug: input.slug } }).catch(() => null);
  if (existing) return { ok: false as const, reason: "slug_exists" };
  const created = await db.learningCourse.create({
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      icon: input.icon ?? null,
    },
  });
  return { ok: true as const, course: created };
}

export async function listCourses(db: DbLike, opts: { category?: string; take?: number } = {}) {
  if (!db) return { ok: false as const, reason: "db_not_configured", courses: [] as any[] };
  const where: any = {};
  if (opts.category) where.category = opts.category;
  const courses = await db.learningCourse.findMany({ where, orderBy: [{ order: "asc" }], take: opts.take ?? 20 });
  return { ok: true as const, courses };
}

export async function createModule(db: DbLike, input: LearningModuleInput) {
  if (!db) return { ok: false as const, reason: "db_not_configured" };
  const s = validateSlug(input.slug);
  if (!s.ok) return { ok: false as const, reason: s.error };
  const course = await db.learningCourse.findUnique({ where: { id: input.courseId } }).catch(() => null);
  if (!course) return { ok: false as const, reason: "course_not_found" };
  const created = await db.learningModule.create({ data: { courseId: input.courseId, slug: input.slug, title: input.title } });
  return { ok: true as const, module: created };
}

export async function createLesson(db: DbLike, input: LearningLessonInput) {
  if (!db) return { ok: false as const, reason: "db_not_configured" };
  const s = validateSlug(input.slug);
  if (!s.ok) return { ok: false as const, reason: s.error };
  const mod = await db.learningModule.findUnique({ where: { id: input.moduleId } }).catch(() => null);
  if (!mod) return { ok: false as const, reason: "module_not_found" };
  const created = await db.learningLesson.create({
    data: {
      moduleId: input.moduleId,
      slug: input.slug,
      title: input.title,
      content: input.content,
      tags: "[]",
      prerequisites: "[]",
    },
  });
  return { ok: true as const, lesson: created };
}

export async function reviewCardAction(input: z.infer<typeof ReviewCardSchema>) {
  const parsed = ReviewCardSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, reason: parsed.error.issues[0]?.message ?? "invalid" };
  const card = {
    easeFactor: input.easeFactor ?? 2.5,
    intervalDays: input.intervalDays ?? 0,
    repetitions: input.repetitions ?? 0,
    nextReview: new Date(),
  };
  const next = calculateNextReview(card, { quality: input.quality });
  return { ok: true as const, cardId: input.cardId, next };
}

// ---------- Tool descriptor ----------
export const learningSystemDescriptor = {
  capability: "learning-system" as const,
  toolName: "learning_manage" as const,
  description:
    "Learning System: cursos/modulos/lecciones + progreso SRS SM-2 + bilingue. DB inyectada via opts.db. Acciones: create_course/list_courses/create_module/create_lesson/review_card. SQLite, fail-soft.",
};

// ---------- Handler for llm.ts ----------
export async function learningSystemHandler(
  params: {
    action: "create_course" | "list_courses" | "create_module" | "create_lesson" | "review_card";
    course?: LearningCourseInput;
    module?: LearningModuleInput;
    lesson?: LearningLessonInput;
    review?: z.infer<typeof ReviewCardSchema>;
    category?: string;
    db?: DbLike;
  },
  opts: { db?: DbLike } = {}
) {
  const db = params.db ?? opts.db;
  switch (params.action) {
    case "create_course":
      if (!params.course) return { ok: false, reason: "missing_course" };
      return createCourse(db, params.course);
    case "list_courses":
      return listCourses(db, { category: params.category });
    case "create_module":
      if (!params.module) return { ok: false, reason: "missing_module" };
      return createModule(db, params.module);
    case "create_lesson":
      if (!params.lesson) return { ok: false, reason: "missing_lesson" };
      return createLesson(db, params.lesson);
    case "review_card":
      if (!params.review) return { ok: false, reason: "missing_review" };
      return reviewCardAction(params.review);
    default:
      return { ok: false, reason: "unknown_action" };
  }
}
