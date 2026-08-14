import { registerGenEngineIfHealthy, setDefaultMusicProviderEnabled } from '@ultraia/core';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
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