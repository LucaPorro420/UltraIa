import { requireUser } from '@/lib/server/context';
import { MetricsClient } from '@/components/metrics-client';

export const metadata = { title: 'Métricas — UltraIa' };

export default async function MetricsPage() {
  await requireUser();
  return <MetricsClient />;
}