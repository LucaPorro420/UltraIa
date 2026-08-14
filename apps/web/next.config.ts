import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ultraia/core'],
  serverExternalPackages: ['@prisma/client'],
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
              "img-src 'self' data: https://image.pollinations.ai https://*.pollinations.ai https://images.meigen.ai https://www.meigen.ai https://i.ytimg.com",
              "font-src 'self' data:",
              "connect-src 'self' https://image.pollinations.ai https://text.pollinations.ai https://*.pollinations.ai https://www.meigen.ai https://api.meigen.ai https://r.jina.ai https://api.duckduckgo.com https://api.exa.ai https://api.github.com https://www.youtube.com",
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

