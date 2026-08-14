import { requireUser } from '@/lib/server/context';
import { BuilderClient } from '@/components/builder/builder-client';

export const metadata = { title: 'Builder · UltraIa' };

export default async function BuilderPage() {
  await requireUser();
  return <BuilderClient />;
}