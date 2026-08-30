/**
 * POST /api/vitals
 *
 * Receives Core Web Vitals reports from the client.
 * Logs to console in dev, silently accepts in production.
 * 
 * This is a fire-and-forget endpoint - never blocks the client.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { name, value, rating, delta, id, page, userAgent, timestamp } = body;
    
    // Validate required fields
    if (!name || typeof value !== 'number') {
      return Response.json({ ok: true }); // Silent accept
    }

    // Log in development (fail-soft — no DB dependency)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[vitals] ${name}: ${value.toFixed(2)} (${rating}) — ${page || '/'}`);
    }

    return Response.json({ ok: true });
  } catch {
    // Always succeed - vitals reporting should never fail
    return Response.json({ ok: true });
  }
}
