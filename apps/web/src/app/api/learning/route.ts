/**
 * ============================================================================
 * LEARNING OVERVIEW — Vista general del sistema de aprendizaje
 * ============================================================================
 *
 * [EN] Provides an overview of the learning system state.
 * [ES] Proporciona una visión general del estado del sistema de aprendizaje.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'overview';

  // Learning system overview
  const overview = {
    type,
    totalCourses: 0,
    completedLessons: 0,
    studyStreak: 0,
    nextReview: new Date().toISOString(),
    activeDecks: 0,
  };

  return new Response(JSON.stringify(overview), {
    headers: { 'Content-Type': 'application/json' },
  });
}