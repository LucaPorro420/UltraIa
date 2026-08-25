import { requireUser } from '@/lib/server/context';
import { IdeShell } from '@/components/ide/ide-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <IdeShell userName={user.name ?? user.email ?? 'user'}>
      {children}
    </IdeShell>
  );
}
