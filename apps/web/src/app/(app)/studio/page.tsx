import { requireUser } from '@/lib/server/context';
import { StudioClient } from './studio-client';

export const metadata = { title: 'Studio · UltraIa' };

export default async function StudioPage() {
  const user = await requireUser();
  return <StudioClient user={{ name: user.name, email: user.email }} />;
}
