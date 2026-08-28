import { requireUser } from '@/lib/server/context';
import { PALETTE_NAMES } from '@ultraia/core';
import { ProceduralPlaygroundClient } from '@/components/lab/procedural-playground-client';

export const metadata = { title: 'Lab · Procedural — UltraIa' };

export default async function ProceduralPage() {
  await requireUser();
  return <ProceduralPlaygroundClient palettes={[...PALETTE_NAMES]} />;
}
