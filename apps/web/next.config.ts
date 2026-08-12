import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ultraia/core'],
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
