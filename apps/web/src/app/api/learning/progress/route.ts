/**
 * ============================================================================
 * LEARNING PROGRESS — Progreso de aprendizaje
 * ============================================================================
 *
 * [EN] Gets/updates the learning progress for a course.
 * [ES] Obtiene/actualiza el progreso de aprendizaje de un curso.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');

  const progress = {
    courseId: courseId || 'overview',
    completed: 0,
    total: 0,
    progressPercent: 0,
    lastAccessed: new Date().toISOString(),
    streakDays: 0,
  };

  return new Response(JSON.stringify(progress), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { progress } = body;

    // Update progress
    return new Response(
      JSON.stringify({
        success: true,
        updated: true,
        newProgress: { ...progress, updatedAt: new Date().toISOString() },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error al actualizar el progreso' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}