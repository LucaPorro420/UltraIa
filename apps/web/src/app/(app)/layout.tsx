import { requireUser } from '@/lib/server/context';
import { AppNav } from '@/components/app-shell/nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="relative flex h-screen overflow-hidden bg-canvas text-neutral-100">
      <div aria-hidden className="aurora-bg pointer-events-none absolute inset-0 opacity-60" />
      <AppNav userName={user.name ?? user.email ?? 'user'} />
      <main className="relative flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}