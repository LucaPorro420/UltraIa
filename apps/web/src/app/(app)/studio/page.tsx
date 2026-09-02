import { requireUser } from '@/lib/server/context';
import { OSS_CATALOG } from '@ultraia/core';
import { StudioClient } from './StudioClientWrapper';

export const metadata = {
  title: 'Studio · UltraIa',
  description:
    'Combine multiple AI agents — web, image, video, music and chat — in one multimodal workspace with a durable media hub.',
};

export default async function StudioPage() {
  const user = await requireUser();
  return (
    <StudioClient
      user={{ name: user.name, email: user.email }}
      ossCatalog={OSS_CATALOG}
    />
  );
}
