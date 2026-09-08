/**
 * Learning Repo — Prisma adapter for Learning System.
 * Separa dominio (pure) de infraestructura (Prisma).
 */
import type { Db } from "../../db/client";

export async function findCourseBySlug(db: Db, slug: string) {
  if (!db) return null;
  return db.learningCourse.findUnique({ where: { slug } }).catch(() => null);
}

export async function listAllCourses(db: Db, take = 20) {
  if (!db) return [];
  return db.learningCourse.findMany({ orderBy: [{ order: "asc" }], take }).catch(() => []);
}
