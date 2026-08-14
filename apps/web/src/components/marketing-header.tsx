'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';

type MarketingHeaderProps = { user: { name?: string | null; email: string } | null };

const NAV_LINKS = [
  { href: '/explore', label: 'Explore' },
  { href: '/recursos', label: 'Recursos' },
];

export function MarketingHeader({ user }: MarketingHeaderProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="border-b border-border-subtle bg-panel/80 backdrop-blur-md">
      <div className="mx-auto flex h-[38px] max-w-5xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-mono text-sm font-bold tracking-tight transition-opacity duration-200 hover:opacity-80"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Ultra<span className="text-primary">Ia</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-2.5 py-1 text-sm transition-colors duration-200 ${
                  active
                    ? 'bg-panel-hover font-medium text-white'
                    : 'font-normal text-neutral-300 hover:text-white'
                }`}
              >
                {label}
              </Link>
            );
          })}

          {user && (
            <Link
              href="/studio"
              className={`rounded-md px-2.5 py-1 text-sm transition-colors duration-200 ${
                isActive('/studio')
                  ? 'bg-panel-hover font-medium text-white'
                  : 'font-normal text-neutral-300 hover:text-white'
              }`}
            >
              Studio
            </Link>
          )}

          <span aria-hidden className="mx-1 hidden h-4 w-px bg-border-subtle sm:block" />

          {user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-[0_0_18px_-8px_var(--color-primary)] transition-all duration-200 hover:bg-primary/85 hover:shadow-[0_0_28px_-6px_var(--color-primary)]"
            >
              Open dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-2.5 py-1 text-sm text-neutral-300 transition-colors duration-200 hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-[0_0_18px_-8px_var(--color-primary)] transition-all duration-200 hover:bg-primary/85 hover:shadow-[0_0_28px_-6px_var(--color-primary)]"
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