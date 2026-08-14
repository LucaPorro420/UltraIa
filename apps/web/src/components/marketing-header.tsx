import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MarketingHeaderProps = { user: { name?: string | null; email: string } | null };

export function MarketingHeader({ user }: MarketingHeaderProps) {
  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Sparkles className="h-4 w-4 text-violet-400" />
          Ultra<span className="text-violet-400">Ia</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/explore" className="text-neutral-300 transition-colors duration-200 hover:text-white">
            Explore
          </Link>
          {user ? (
            <>
              <Link href="/studio" className="text-neutral-300 transition-colors duration-200 hover:text-white">
                Studio
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-violet-500"
              >
                Open dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-neutral-300 transition-colors duration-200 hover:text-white">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-violet-500"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
