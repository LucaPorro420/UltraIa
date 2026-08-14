import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ultraia/core'],
  serverExternalPackages: ['@prisma/client', '@google/stitch-sdk'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const serverOnlyBuiltins = [
        'child_process',
        'crypto',
        'fs',
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
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://image.pollinations.ai https://*.pollinations.ai https://images.meigen.ai https://www.meigen.ai https://i.ytimg.com https://d1s1y0ui543e5o.cloudfront.net",
              "font-src 'self' data:",
              "connect-src 'self' https://image.pollinations.ai https://text.pollinations.ai https://*.pollinations.ai https://www.meigen.ai https://api.meigen.ai https://r.jina.ai https://api.duckduckgo.com https://api.exa.ai https://api.github.com https://www.youtube.com https://mcp.tunetank.com https://d1s1y0ui543e5o.cloudfront.net https://mixkit.co",
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

