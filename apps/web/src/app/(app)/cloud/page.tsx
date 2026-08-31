import { requireUser } from '@/lib/server/context';
import { CloudClient } from '@/components/cloud-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cloud — UltraIa' };

export default async function CloudPage() {
  await requireUser();
  return <CloudClient />;
}