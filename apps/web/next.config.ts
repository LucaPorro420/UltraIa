/*
  Archivo: apps/web/next.config.ts
  Propósito (explicado para un adolescente):
  - Este archivo configura cómo Next.js (la parte web) se construye y se ejecuta.
  - No es la app en sí; es la «configuración» que le dice a Next.js qué comportamientos usar
    (por ejemplo, qué paquetes transpilar, límites de memoria, reglas de seguridad en headers).

  Qué tocar si quieres cambiar algo concreto:
  - Cambia `WEB_PORT` en start.py si quieres otro puerto local (pero aquí no está).
  - Para permitir nuevas fuentes de imagen, añade un `remotePattern` en `images.remotePatterns`.
  - Si añades librerías que usan APIs de Node en el navegador, agrégalas a `webpack.resolve.fallback`.

  Nota: mantuve intacta la lógica y solo añadí comentarios explicativos en español simple.
*/

import type { NextConfig } from 'next';

// Configuración principal de Next.js.
// Explicación simple: Next.js lee esto al arrancar para saber cómo compilar y cómo servir la app.
const nextConfig: NextConfig = {
  // output: 'standalone' — removed: causes ENOENT on App Router-only projects
  // (no pages-manifest.json). Not needed for Vercel deployment.

  // transpilePackages: lista paquetes que TypeScript/Next debe transpilar.
  // Aquí se marca '@ultraia/core' porque es una librería internal del monorepo.
  transpilePackages: ['@ultraia/core'],

  // Paquetes que solo funcionan en el servidor y deben tratarse como externos
  // cuando se ejecuta código en el navegador (evitar que se empaqueten para client).
  serverExternalPackages: ['@prisma/client', '@google/stitch-sdk'],

  // eslint y typescript se verifican en gates CI separados (typecheck → lint → test → build).
  // Si el build local falla por un error de tipo/lint, corrígelo antes de commitear.

  // Experimental: limitar workers a 1 para reducir uso de CPU/RAM en máquinas pequeñas.
  experimental: { cpus: 1 }, // un solo worker de generación estática = menos RAM

  // Performance budgets: modularizar imports para reducir el tamaño de bundles.
  modularizeImports: {
    'lucide-react': {
      // Cuando importes iconos por nombre, Next los resolverá al archivo ESM del icono.
      transform: 'lucide-react/dist/esm/icons/{{ kebabCase member }}',
    },
  },

  // webpack: ajustes personalizados para el empaquetador.
  // Aquí se configura cache persistente, splitChunks y fallback para módulos de Node.
  webpack: (config, { isServer }) => {
    // Cache en disco para aceleraciones entre builds.
    config.cache = { type: 'filesystem' }; // caché persistente: evita recompilación completa

    if (!isServer) {
      // splitChunks: consolidar chunks pequeños para menos requests HTTP
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 250000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          default: false,
          vendors: false,
          // Three.js separado por ser pesado
          three: {
            test: /[\\/]node_modules[\\/]three[\\/]/,
            name: 'three',
            chunks: 'all',
            priority: 20,
          },
          // Vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
            priority: 10,
          },
          // Common chunks
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };

      // Lista de módulos que solo existen en Node (no en navegadores).
      // Si un paquete intenta usar 'fs' o 'crypto' en el cliente, lo marcamos como no disponible
      // para evitar errores de empaquetado.
      const serverOnlyBuiltins = [
        'child_process',
        'crypto',
        'fs',
        'fs/promises',
        'path',
        'net',
        'tls',
        'os',
        'worker_threads',
        'async_hooks',
        'perf_hooks',
        'readline',
        'repl',
        'vm',
        'v8',
        'diagnostics_channel',
        'inspector',
        'module',
        'sys',
        'trace_events',
        'tty',
        'dgram',
        'dns',
        'cluster',
        'http2',
        'wasi',
        'webcrypto',
      ];
      for (const mod of serverOnlyBuiltins) {
        config.resolve.fallback = {
          ...(config.resolve.fallback ?? {}),
          [`node:${mod}`]: false,
        };
      }
    }
    return config;
  },

  // images.remotePatterns: permite cargar imágenes remotas desde dominios listados.
  // Si la app muestra imágenes generadas por servicios externos, añádelos aquí.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.pollinations.ai' },
      { protocol: 'https', hostname: '*.pollinations.ai' },
      { protocol: 'https', hostname: 'images.meigen.ai' },
      { protocol: 'https', hostname: 'www.meigen.ai' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },

  // Cabeceras HTTP de seguridad y compresión: se aplican a todas las rutas.
  // Explicación simple: estas reglas ayudan a que los navegadores no permitan
  // ciertas cosas peligrosas (inyección de código, frames externos, etc.).
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // img-src permite imágenes de orígenes concretos (añade los tuyos si necesitas).
              "img-src 'self' data: https://image.pollinations.ai https://*.pollinations.ai https://images.meigen.ai https://www.meigen.ai https://i.ytimg.com https://d1s1y0ui543e5o.cloudfront.net",
              "font-src 'self' data: https://fonts.gstatic.com",
              // connect-src incluye websockets locales y endpoints de imagen/LLM.
              "connect-src 'self' ws://localhost:* wss://localhost:* https://image.pollinations.ai https://text.pollinations.ai https://*.pollinations.ai https://www.meigen.ai https://api.meigen.ai",
              "frame-ancestors 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      // Compresión gzip/brotli para assets estáticos
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Encoding', value: 'br, gzip' },
        ],
      },
      {
        source: '/_next/image/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Encoding', value: 'br, gzip' },
        ],
      },
      {
        source: '/:path*.(js|css|woff|woff2|png|jpg|jpeg|gif|svg|ico|webp|avif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Encoding', value: 'br, gzip' },
        ],
      },
    ];
  },
};

export default nextConfig;
