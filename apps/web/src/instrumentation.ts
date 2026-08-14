import { setDefaultMusicProviderEnabled } from '@ultraia/core';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    setDefaultMusicProviderEnabled(true);
  }
}