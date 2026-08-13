import type { MetadataRoute } from 'next';
import { prisma } from '@ultraia/core';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || 'http://localhost:3000';
  const now = new Date();
  const publicAgents = await prisma.agentBlueprint.findMany({
    where: { isPublic: true },
    select: { id: true, createdAt: true },
    take: 1000,
  });
  return [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/explore`, lastModified: now },
    ...publicAgents.map((a) => ({
      url: `${base}/a/${a.id}`,
      lastModified: a.createdAt,
    })),
  ];
}
