import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://plataforma-total-unificada.dev',
  integrations: [react(), tailwind()],
  output: 'static',
  adapter: undefined,
  vite: {
    optimizeDeps: {
      include: ['zustand', 'lucide-react'],
    },
  },
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
    assets: 'assets',
  },
  prefetch: true,
});