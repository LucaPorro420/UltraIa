import { requireUser } from '@/lib/server/context';
import { PALETTE_NAMES } from '@ultraia/core';
import { ProceduralClient } from '@/components/lab/procedural-client';

export const metadata = { title: 'Lab · Procedural — UltraIa' };

export default async function ProceduralPage() {
  await requireUser();
  return <ProceduralClient palettes={[...PALETTE_NAMES]} />;
}
