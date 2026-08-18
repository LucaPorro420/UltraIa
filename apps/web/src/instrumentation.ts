/**
 * Instrumentation de UltraIa Web (Next 15).
 *
 * IMPORTANTE (verificado 18/08/2026): Next compila y ejecuta este archivo en AMBOS
 * runtimes (nodejs Y edge), aunque solo se exporte `register`. Los imports ESTÁTICOS
 * de @ultraia/core arrastran node builtins (node:fs/promises, node:path) al bundle
 * edge → `UnhandledSchemeError` en `next dev` (Turbopack). El patrón correcto (doc
 * oficial + issue vercel/next.js#61728): `await import()` condicionado por
 * `NEXT_RUNTIME` DENTRO de register(). Edge compile → función vacía sin core.
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
  }
}
