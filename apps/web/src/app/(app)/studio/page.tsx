import { requireUser } from '@/lib/server/context';
import { StudioClient } from './studio-client';

export const metadata = {
  title: 'Studio · UltraIa',
  description:
    'Combine multiple AI agents — web, image, video, music and chat — in one multimodal workspace.',
};

export default async function StudioPage() {
  const user = await requireUser();
  return <StudioClient user={{ name: user.name, email: user.email }} />;
}
