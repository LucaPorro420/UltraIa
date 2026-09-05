/**
 * Instrumentacion de UltraIa Web (Next 15).
 *
 * IMPORTANTE (verificado 18/08/2026): Next compila y ejecuta este archivo en AMBOS
 * runtimes (nodejs Y edge), aunque solo se exporte `register`. Los imports ESTATICOS
 * de @ultraia/core arrastran node builtins (node:fs/promises, node:path) al bundle
 * edge → `UnhandledSchemeError` en `next dev` (Turbopack). El patron correcto (doc
 * oficial + issue vercel/next.js#61728): `await import()` condicionado por
 * `NEXT_RUNTIME` DENTRO de register(). Edge compile → funcion vacia sin core.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerGenEngineIfHealthy, setDefaultMusicProviderEnabled } = await import('@ultraia/core');
    setDefaultMusicProviderEnabled(true);
    if (process.env.GEN_ENGINE_URL) {
      const active = await registerGenEngineIfHealthy({ url: process.env.GEN_ENGINE_URL });
      console.info(
        active
          ? `[gen-engine] providers activos en ${process.env.GEN_ENGINE_URL}`
          : `[gen-engine] no responde en ${process.env.GEN_ENGINE_URL} — keyless`,
      );
    }

    // ─── Boot Unified Orchestrator + Learning Tracker ─────────────────────
    const { getOrchestrator, getLearningTracker } = await import('@ultraia/core');
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const orch = getOrchestrator();
    orch.registerApp({
      type: 'web',
      id: 'web-app',
      status: 'connected',
      lastSeen: Date.now(),
      version: '1.5.0',
      capabilities: ['learning', 'metrics', 'sync', 'orchestration'],
    });
    console.info('[orchestrator] web-app registered');

    // Auto-load truths from learning/truth/
    const tracker = getLearningTracker();
    const truthDir = path.resolve(process.cwd(), 'learning', 'truth');
    try {
      const files = await fs.readdir(truthDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      let totalTruths = 0;

      for (const file of jsonFiles) {
        try {
          const raw = await fs.readFile(path.join(truthDir, file), 'utf-8');
          const data = JSON.parse(raw);
          // Truth files may be arrays or have a "truths" property
          const entries = Array.isArray(data) ? data : data.truths || [];
          const truths = entries.map((e: Record<string, unknown>, i: number) => ({
            id: String(e.id || `${file}-${i}`),
            category: String(e.category || file.replace('truth_', '').replace('.json', '')),
            claim: String(e.claim || e.source || ''),
            evidence: String(e.evidence || ''),
            source: String(e.source || file),
            verified: Boolean(e.verified ?? true),
            confidence: typeof e.confidence === 'number' ? e.confidence : 0.9,
            lastVerified: typeof e.lastVerified === 'number' ? e.lastVerified : Date.now(),
          }));
          tracker.loadTruths([...(tracker as any).truths ?? [], ...truths]);
          totalTruths += truths.length;
        } catch { /* skip corrupt file */ }
      }
      console.info(`[learning-tracker] loaded ${totalTruths} truths from ${jsonFiles.length} files`);
    } catch {
      console.info('[learning-tracker] truth directory not found — running empty');
    }
  }
}
