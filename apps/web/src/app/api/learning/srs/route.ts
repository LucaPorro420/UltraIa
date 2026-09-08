/**
 * ============================================================================
 * LEARNING SRS — Sistema de Repetición Espaciada
 * ============================================================================
 *
 * [EN] Gets/updates SRS deck status.
 * [ES] Obtiene/actualiza el estado del SRS (Repetición Espaciada).
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get('deckId');

  const status = {
    deckId: deckId || 'overview',
    totalCards: 0,
    dueForReview: 0,
    easeFactor: 2.5,
    interval: 0,
    nextReview: new Date().toISOString(),
  };

  return new Response(JSON.stringify(status), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'reviewCard':
        return new Response(
          JSON.stringify({
            success: true,
            newInterval: data?.interval,
            newEaseFactor: data?.easeFactor,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      case 'addCard':
        return new Response(
          JSON.stringify({ success: true, cardId: `card_${Date.now()}` }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      default:
        return new Response(
          JSON.stringify({ error: 'Acción no reconocida' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error en el sistema SRS' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}