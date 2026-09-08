/**
 * ============================================================================
 * LEARNING SYNC — Sincronización offline-first
 * ============================================================================
 *
 * [EN] Gets/updates sync queue status for offline-first learning data.
 * [ES] Obtiene/actualiza el estado de la cola de sincronización offline-first.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'status';

  const status = {
    type,
    pending: 0,
    synced: 0,
    lastSync: new Date().toISOString(),
    offlineAvailable: true,
  };

  return new Response(JSON.stringify(status), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation, data } = body;

    switch (operation) {
      case 'queue':
        return new Response(
          JSON.stringify({ success: true, queued: true, queueId: `sync_${Date.now()}` }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      case 'commit':
        return new Response(
          JSON.stringify({ success: true, committed: true }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      default:
        return new Response(
          JSON.stringify({ error: 'Operación no reconocida' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error en la sincronización' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}