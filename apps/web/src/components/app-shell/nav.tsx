'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  Bot,
  Images,
  SquareDashedMousePointer,
  Map,
  Compass,
  BookOpen,
  Cloud,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { logoutAction } from '@/app/(app)/actions';

const ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/studio', label: 'Studio', icon: Sparkles },
  { href: '/agents/new', label: 'New agent', icon: Bot },
  { href: '/gallery', label: 'Gallery', icon: Images },
  { href: '/builder', label: 'Builder', icon: SquareDashedMousePointer },
  { href: '/cloud', label: 'Cloud', icon: Cloud },
  { href: '/metrics', label: 'Métricas', icon: BarChart3 },
  { href: '/roadmap', label: 'Roadmap', icon: Map },
];

const PUBLIC_ITEMS = [
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/recursos', label: 'Recursos', icon: BookOpen },
];

export function AppNav({ userName }: { userName: string }) {
  const pathname = usePathname();

  const item = (href: string, label: string, Icon: typeof LayoutDashboard) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        className={`group relative flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-1.5 text-[13px] transition-all duration-150 ${
          active
            ? 'border-border-subtle bg-panel-hover text-white shadow-[0_0_18px_-10px_rgba(139,92,246,0.5)]'
            : 'text-neutral-400 hover:border-border-subtle/70 hover:bg-panel-hover/60 hover:text-neutral-100'
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
            active
              ? 'text-primary drop-shadow-[0_0_6px_rgba(139,92,246,0.8)]'
              : 'text-neutral-500 group-hover:text-primary/80'
          }`}
        />
        {label}
        {active && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_rgba(139,92,246,0.5)]" />
        )}
      </Link>
    );
  };

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-border-subtle bg-panel">
      <div className="flex h-[38px] items-center gap-2 border-b border-border-subtle px-4">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Ultra<span className="gradient-neo-text">Ia</span>
        </span>
        <span className="ml-auto rounded border border-border-subtle bg-input-active px-1.5 py-0.5 font-mono text-[10px] text-neutral-500">
          v0.1
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3">
        <p className="px-2.5 pb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          Workspace
        </p>
        <nav className="space-y-0.5">{ITEMS.map((it) => item(it.href, it.label, it.icon))}</nav>

        <p className="px-2.5 pb-2 pt-5 font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          Public
        </p>
        <nav className="space-y-0.5">{PUBLIC_ITEMS.map((it) => item(it.href, it.label, it.icon))}</nav>
      </div>

      <div className="border-t border-border-subtle p-2.5">
        <div className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-panel-hover/50">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-border-active to-neo-700 font-mono text-[11px] font-bold text-white shadow-[0_0_12px_-4px_rgba(99,102,241,0.7)] ring-1 ring-white/10">
            {(userName || 'U').slice(0, 1).toUpperCase()}
          </div>
          <span className="truncate text-[12px] text-neutral-300">{userName}</span>
          <form className="ml-auto" action={logoutAction}>
            <button
              type="submit"
              className="rounded p-1 text-neutral-500 transition-colors duration-150 hover:bg-panel-hover hover:text-destructive"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}