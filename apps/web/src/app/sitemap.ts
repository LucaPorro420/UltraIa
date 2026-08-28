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
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/recursos`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/gallery`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/roadmap`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    ...publicAgents.map((a) => ({
      url: `${base}/a/${a.id}`,
      lastModified: a.createdAt,
    })),
  ];
}
