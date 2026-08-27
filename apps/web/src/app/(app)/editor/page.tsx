import { requireUser } from '@/lib/server/context';
import { EditorAdminClient } from '@/components/editor/editor-admin-client';

export default async function EditorPage() {
  const user = await requireUser();
  return (
    <EditorAdminClient
      isAdmin={user.role === 'ADMIN'}
      userName={user.name ?? user.email ?? 'user'}
    />
  );
}
