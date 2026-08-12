import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/server/context';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            Ultra<span className="text-violet-400">Ia</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/agents/new" className="text-neutral-300 hover:text-white">
              + New agent
            </Link>
            <span className="text-neutral-600">|</span>
            <span className="text-neutral-400">{user.name ?? user.email}</span>
            <form
              action={async () => {
                'use server';
                const { cookies } = await import('next/headers');
                const { SESSION_COOKIE } = await import('@ultraia/core');
                (await cookies()).delete(SESSION_COOKIE);
                redirect('/login');
              }}
            >
              <button type="submit" className="text-neutral-500 hover:text-white">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
