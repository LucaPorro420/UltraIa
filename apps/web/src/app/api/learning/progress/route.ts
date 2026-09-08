/**
 * LEARNING PROGRESS — Progreso de aprendizaje (REAL con Prisma + SM-2 helper)
 * GET  /api/learning/progress?courseId=xxx — progreso de curso (optional auth)
 * POST /api/learning/progress { courseId, lessonSlug, status?, score? } — upsert progreso lección
 */
import { prisma } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { parseJsonArray } from '@ultraia/core';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');
  const user = await getCurrentUser(request as any).catch(() => null);

  if (!user) {
    return Response.json(
      { courseId: courseId ?? 'overview', completed: 0, total: 0, progressPercent: 0, streakDays: 0, reason: 'unauthenticated' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (!courseId) {
    const progresses = await prisma.learningProgress.findMany({
      where: { userId: user.id },
      select: { courseId: true, completedLessons: true, totalTimeMinutes: true, streakDays: true, lastStreakDate: true },
    });
    return Response.json({ progresses }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const progress = await prisma.learningProgress.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });

  if (!progress) {
    return Response.json(
      { courseId, completed: 0, total: 0, progressPercent: 0, streakDays: 0 },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const completed = parseJsonArray(progress.completedLessons);
  // total lessons for this course
  const course = await prisma.learningCourse.findUnique({
    where: { id: courseId },
    include: { modules: { include: { _count: { select: { lessons: true } } } } },
  });
  const total = course ? course.modules.reduce((a, m) => a + (m as any)._count.lessons, 0) : 0;
  const progressPercent = total ? Math.round((completed.length / total) * 100) : 0;

  return Response.json(
    {
      courseId,
      completed: completed.length,
      completedLessons: completed,
      total,
      progressPercent,
      totalTimeMinutes: progress.totalTimeMinutes,
      streakDays: progress.streakDays,
      lastStreakDate: progress.lastStreakDate,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request as any).catch(() => null);
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { courseId, lessonSlug, status, score, timeSpentMin } = body as {
      courseId?: string;
      lessonSlug?: string;
      status?: string;
      score?: number;
      timeSpentMin?: number;
    };

    if (!courseId || !lessonSlug) {
      return Response.json({ error: 'courseId and lessonSlug required' }, { status: 400 });
    }

    // ensure lesson exists
    const lesson = await prisma.learningLesson.findFirst({ where: { slug: lessonSlug } });
    if (!lesson) return Response.json({ error: 'lesson not found' }, { status: 404 });

    // upsert LearningLessonProgress
    const lp = await prisma.learningLessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
      update: {
        status: status ?? 'completed',
        score: typeof score === 'number' ? score : undefined,
        timeSpentMin: typeof timeSpentMin === 'number' ? { increment: timeSpentMin } as any : undefined,
        completedAt: status === 'completed' || !status ? new Date() : undefined,
        attempts: { increment: 1 },
      },
      create: {
        userId: user.id,
        lessonId: lesson.id,
        status: status ?? 'completed',
        score: typeof score === 'number' ? score : null,
        timeSpentMin: typeof timeSpentMin === 'number' ? timeSpentMin : 0,
        completedAt: new Date(),
      },
    });

    // update LearningProgress completedLessons
    const prog = await prisma.learningProgress.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    let completedLessons: string[] = prog ? parseJsonArray(prog.completedLessons) : [];
    if (!completedLessons.includes(lessonSlug)) completedLessons.push(lessonSlug);

    await prisma.learningProgress.upsert({
      where: { userId_courseId: { userId: user.id, courseId } },
      update: {
        completedLessons: JSON.stringify(completedLessons),
        lastAccessedAt: new Date(),
        totalTimeMinutes: typeof timeSpentMin === 'number' ? { increment: timeSpentMin } as any : undefined,
      },
      create: {
        userId: user.id,
        courseId,
        completedLessons: JSON.stringify(completedLessons),
        currentLessonId: lessonSlug,
      },
    });

    return Response.json({ ok: true, lessonProgress: lp, completedLessons }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return Response.json({ error: 'Error al actualizar progreso' }, { status: 500 });
  }
}
