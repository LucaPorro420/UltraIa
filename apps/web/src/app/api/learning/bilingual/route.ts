/**
 * ============================================================================
 * LEARNING BILINGUAL — Documentos bilingües
 * ============================================================================
 *
 * [EN] Gets/updates bilingual document status.
 * [ES] Obtiene/actualiza el estado de documentos bilingües.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('docId');

  const status = {
    docId: docId || 'overview',
    languages: ['es', 'ar'],
    currentLang: 'es',
    progress: 0,
    lastSynced: new Date().toISOString(),
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
      case 'updateLanguage':
        return new Response(
          JSON.stringify({ success: true, newLanguage: data?.language || 'es' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      case 'syncVersion':
        return new Response(
          JSON.stringify({ success: true, syncedVersion: data?.version || '1.0' }),
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
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}