'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';
import { logoutAction } from '@/app/(app)/actions';

type MarketingHeaderProps = {
  user: { name?: string | null; email: string } | null;
};

const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/explore', label: 'Explorar' },
  { href: '/recursos', label: 'Recursos' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/course', label: 'Curso' },
];

export function MarketingHeader({ user }: MarketingHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    `rounded-md px-3 py-1.5 text-sm transition-colors duration-200 ${
      isActive(href)
        ? 'bg-panel-hover font-medium text-white'
        : 'font-normal text-neutral-300 hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-panel/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex shrink-0 items-center gap-2 font-mono text-sm font-bold tracking-tight text-white transition-opacity duration-200 hover:opacity-80"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          Ultra<span className="text-primary">Ia</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              {label}
            </Link>
          ))}
          {user && (
            <Link href="/studio" className={linkClass('/studio')}>
              Studio
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md px-3 py-1.5 text-sm text-neutral-300 transition-colors duration-200 hover:text-white"
                >
                  Cerrar sesión
                </button>
              </form>
              <Link
                href="/dashboard"
                className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-white shadow-[0_0_18px_-8px_var(--color-primary)] transition-all duration-200 hover:bg-primary/85 hover:shadow-[0_0_28px_-6px_var(--color-primary)]"
              >
                Abrir app
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-sm text-neutral-300 transition-colors duration-200 hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-white shadow-[0_0_18px_-8px_var(--color-primary)] transition-all duration-200 hover:bg-primary/85 hover:shadow-[0_0_28px_-6px_var(--color-primary)]"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-md border border-border-subtle text-neutral-200 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div id="mobile-nav" className="border-t border-border-subtle bg-panel md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2 text-sm ${
                  isActive(href) ? 'bg-panel-hover font-medium text-white' : 'text-neutral-300'
                }`}
              >
                {label}
              </Link>
            ))}
            {user && (
              <Link
                href="/studio"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-neutral-300"
              >
                Studio
              </Link>
            )}
            <div className="my-2 h-px bg-border-subtle" />
            {user ? (
              <div className="flex flex-col gap-1">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-white"
                >
                  Abrir app
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    onClick={() => setOpen(false)}
                    className="w-full rounded-md px-3 py-2 text-center text-sm text-neutral-300"
                  >
                    Cerrar sesión
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-center text-sm text-neutral-300"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-white"
                >
                  Get started
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
