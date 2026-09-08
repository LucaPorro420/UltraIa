/**
 * LEARNING OVERVIEW — Vista general del sistema de aprendizaje (REAL con Prisma)
 * GET /api/learning?type=overview
 */
import { prisma } from '@ultraia/core';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'overview';

  const [courses, modules, lessons, decks, cards, searchIndex] = await Promise.all([
    prisma.learningCourse.count({ where: { isPublished: true } }),
    prisma.learningModule.count({ where: { isPublished: true } }),
    prisma.learningLesson.count({ where: { isPublished: true } }),
    prisma.studyDeck.count(),
    prisma.studyCard.count(),
    prisma.searchIndex.count(),
  ]);

  const dueCards = await prisma.studyCard.count({ where: { nextReview: { lte: new Date() } } });

  const overview = {
    type,
    totalCourses: courses,
    totalModules: modules,
    totalLessons: lessons,
    decks,
    cards,
    dueCards,
    searchIndex,
    generatedAt: new Date().toISOString(),
  };

  return Response.json(overview, { headers: { 'Cache-Control': 'no-store' } });
}
