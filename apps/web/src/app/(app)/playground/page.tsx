import { requireUser } from '@/lib/server/context';
import { PlaygroundClient } from './playground-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Playground -- UltraIa' };

export default async function PlaygroundPage() {
  await requireUser();
  return <PlaygroundClient />;
}
