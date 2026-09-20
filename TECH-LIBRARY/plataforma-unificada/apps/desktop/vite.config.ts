import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@plataforma-unificada/core': path.resolve(__dirname, '../../packages/core/src'),
      '@plataforma-unificada/learning': path.resolve(__dirname, '../../packages/learning/src'),
      '@plataforma-unificada/agents': path.resolve(__dirname, '../../packages/agents/src'),
      '@plataforma-unificada/gateway': path.resolve(__dirname, '../../packages/gateway/src'),
    },
  },
});