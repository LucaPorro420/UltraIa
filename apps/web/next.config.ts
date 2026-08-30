import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: 'standalone' — deshabilitado en dev para evitar problemas con rutas estáticas.
  // Restaurar en producción si se necesita empaquetado independiente.
  transpilePackages: ['@ultraia/core'],
  serverExternalPackages: ['@prisma/client', '@google/stitch-sdk'],
  // Low-RAM build: typecheck/lint ya corren como gates separados, así que no se repiten
  // aquí (ahorra memoria y tiempo). El build sigue validando la compilación.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: { cpus: 1 }, // un solo worker de generación estática = menos RAM
  
  // Performance budgets
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{ kebabCase member }}',
    },
  },
  
  webpack: (config, { isServer }) => {
    config.cache = { type: 'filesystem' }; // caché persistente: evita recompilación completa en cada request
    if (!isServer) {
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
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.pollinations.ai' },
      { protocol: 'https', hostname: '*.pollinations.ai' },
      { protocol: 'https', hostname: 'images.meigen.ai' },
      { protocol: 'https', hostname: 'www.meigen.ai' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https://image.pollinations.ai https://*.pollinations.ai https://images.meigen.ai https://www.meigen.ai https://i.ytimg.com https://d1s1y0ui543e5o.cloudfront.net https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' ws://localhost:* wss://localhost:* https://image.pollinations.ai https://text.pollinations.ai https://*.pollinations.ai https://www.meigen.ai https://api.meigen.ai https://r.jina.ai https://api.duckduckgo.com https://api.exa.ai https://api.github.com https://www.youtube.com https://mcp.tunetank.com https://d1s1y0ui543e5o.cloudfront.net https://mixkit.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

