'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  type LayoutStorage,
  type PanelImperativeHandle,
} from 'react-resizable-panels';
import { PanelLeftClose, PanelLeftOpen, SquareTerminal, LogOut } from 'lucide-react';
import { ALL_NAV_ITEMS, WORKSPACE_ITEMS, PUBLIC_NAV_ITEMS, type NavItem } from './nav-items';
import { logoutAction } from '@/app/(app)/actions';

/**
 * UltraIa IDE Shell (F1) — entorno todo-en-uno:
 *  rail fijo de iconos · explorador redimensionable · contenido · panel inferior.
 * Persistencia de tamaños en localStorage (`ultraia-shell-*`), atajos Ctrl+B / Ctrl+J
 * y fallback móvil en columna única (<768px).
 */

const STORAGE: LayoutStorage = {
  getItem: (key) => (typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
};

/** Umbral px bajo el cual consideramos el explorador colapsado (sincroniza drags manuales). */
const EXPLORER_CLOSED_PX = 96;
/** Umbral px para el panel inferior. */
const DOCK_CLOSED_PX = 40;

function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

function useActivePath() {
  return usePathname();
}

/* ── Rail de iconos (fijo, no redimensionable) ─────────────────────────── */

function IdeRail({
  userName,
  explorerOpen,
  dockOpen,
  onToggleExplorer,
  onToggleDock,
}: {
  userName: string;
  explorerOpen: boolean;
  dockOpen: boolean;
  onToggleExplorer: () => void;
  onToggleDock: () => void;
}) {
  const pathname = useActivePath();
  return (
    <div className="relative z-10 flex h-full w-[52px] shrink-0 flex-col items-center gap-1 border-r border-border-subtle bg-panel py-2">
      <Link
        href="/dashboard"
        title="UltraIa"
        className="mb-1 flex h-8 w-8 items-center justify-center rounded-md font-mono text-[11px] font-bold text-white shadow-[0_0_12px_-4px_rgba(99,102,241,0.7)] ring-1 ring-white/10 bg-gradient-to-br from-border-active to-neo-700"
      >
        UI
      </Link>

      <RailButton
        title={explorerOpen ? 'Ocultar explorador (Ctrl+B)' : 'Mostrar explorador (Ctrl+B)'}
        onClick={onToggleExplorer}
        active={explorerOpen}
      >
        {explorerOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </RailButton>

      <div className="my-1 h-px w-6 bg-border-subtle" />

      <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ALL_NAV_ITEMS.map((it) => {
          const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <Link
              key={it.href}
              href={it.href}
              title={it.label}
              className={`group relative flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150 ${
                active
                  ? 'bg-panel-hover text-white shadow-[0_0_18px_-10px_rgba(139,92,246,0.5)]'
                  : 'text-neutral-500 hover:bg-panel-hover/60 hover:text-neutral-100'
              }`}
            >
              <it.icon
                className={`h-4 w-4 transition-colors duration-150 ${
                  active
                    ? 'text-primary drop-shadow-[0_0_6px_rgba(139,92,246,0.8)]'
                    : 'group-hover:text-primary/80'
                }`}
              />
              {active && (
                <span className="absolute -left-[9px] h-5 w-[2px] rounded-full bg-primary shadow-[0_0_8px_2px_rgba(139,92,246,0.5)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <RailButton title={dockOpen ? 'Ocultar panel inferior (Ctrl+J)' : 'Mostrar panel inferior (Ctrl+J)'} onClick={onToggleDock} active={dockOpen}>
        <SquareTerminal className="h-4 w-4" />
      </RailButton>

      <UserAvatar userName={userName} compact />
    </div>
  );
}

function RailButton({
  title,
  onClick,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150 ${
        active
          ? 'bg-panel-hover text-neutral-100'
          : 'text-neutral-500 hover:bg-panel-hover/60 hover:text-neutral-100'
      }`}
    >
      {children}
    </button>
  );
}

function UserAvatar({ userName, compact }: { userName: string; compact?: boolean }) {
  return (
    <form action={logoutAction} className={compact ? '' : 'ml-auto'}>
      <button
        type="submit"
        title={`Cerrar sesión (${userName})`}
        className={`flex items-center justify-center rounded-full bg-gradient-to-br from-border-active to-neo-700 font-mono text-[11px] font-bold text-white shadow-[0_0_12px_-4px_rgba(99,102,241,0.7)] ring-1 ring-white/10 ${
          compact ? 'h-7 w-7' : 'h-6 w-6'
        }`}
      >
        {(userName || 'U').slice(0, 1).toUpperCase()}
      </button>
    </form>
  );
}

/* ── Explorador (panel secundario con etiquetas) ───────────────────────── */

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  const pathname = useActivePath();
  return (
    <>
      <p className="px-2.5 pb-2 pt-5 font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-500 first:pt-1">
        {title}
      </p>
      <nav className="space-y-0.5">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`group relative flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-1.5 text-[13px] transition-all duration-150 ${
                active
                  ? 'border-border-subtle bg-panel-hover text-white shadow-[0_0_18px_-10px_rgba(139,92,246,0.5)]'
                  : 'text-neutral-400 hover:border-border-subtle/70 hover:bg-panel-hover/60 hover:text-neutral-100'
              }`}
            >
              <it.icon
                className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                  active
                    ? 'text-primary drop-shadow-[0_0_6px_rgba(139,92,246,0.8)]'
                    : 'text-neutral-500 group-hover:text-primary/80'
                }`}
              />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function IdeExplorer({ userName }: { userName: string }) {
  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex h-[38px] shrink-0 items-center gap-2 border-b border-border-subtle px-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Ultra<span className="gradient-neo-text">Ia</span>
        </span>
        <span className="ml-auto rounded border border-border-subtle bg-input-active px-1.5 py-0.5 font-mono text-[10px] text-neutral-500">
          v0.1
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 py-3">
        <NavSection title="Workspace" items={WORKSPACE_ITEMS} />
        <NavSection title="Public" items={PUBLIC_NAV_ITEMS} />
      </div>
      <div className="flex items-center gap-2.5 border-t border-border-subtle p-2.5">
        <span className="truncate text-[12px] text-neutral-300">{userName}</span>
        <form action={logoutAction} className="ml-auto">
          <button
            type="submit"
            title="Cerrar sesión"
            className="rounded p-1 text-neutral-500 transition-colors duration-150 hover:bg-panel-hover hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Panel inferior (dock) ─────────────────────────────────────────────── */

function IdeDock() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex h-[32px] shrink-0 items-center gap-3 border-b border-border-subtle bg-panel-header px-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-300">
          Actividad
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">Estado</span>
        <span className="ml-auto font-mono text-[10px] text-neutral-600">
          Ctrl+B explorador · Ctrl+J este panel
        </span>
      </div>
      <div className="flex flex-1 flex-wrap content-start items-center gap-2 overflow-y-auto p-3 text-[11px] text-neutral-400">
        <span className="rounded border border-border-subtle bg-input-active px-2 py-0.5 font-mono">
          UltraIa v0.1
        </span>
        <span className="rounded border border-border-subtle bg-input-active px-2 py-0.5 font-mono">
          Shell IDE activo
        </span>
        {mounted && (
          <span className="rounded border border-border-subtle bg-input-active px-2 py-0.5 font-mono">
            Sesión iniciada
          </span>
        )}
        <span className="text-neutral-600">
          El feed de actividad en vivo llegará con la fase F4 (conexiones + HUD).
        </span>
      </div>
    </div>
  );
}

/* ── Fallback móvil (<768px): columna única ────────────────────────────── */

function MobileShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const pathname = useActivePath();
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-canvas text-neutral-100">
      <div aria-hidden className="aurora-bg pointer-events-none absolute inset-0 opacity-60" />
      <header className="relative z-10 flex h-[44px] shrink-0 items-center gap-2 border-b border-border-subtle bg-panel px-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Ultra<span className="gradient-neo-text">Ia</span>
        </span>
        <span className="rounded border border-border-subtle bg-input-active px-1.5 py-0.5 font-mono text-[10px] text-neutral-500">
          v0.1
        </span>
        <UserAvatar userName={userName} compact />
      </header>
      <nav className="relative z-10 flex shrink-0 gap-1 overflow-x-auto border-b border-border-subtle bg-panel px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ALL_NAV_ITEMS.map((it) => {
          const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12px] transition-colors duration-150 ${
                active ? 'bg-panel-hover text-white' : 'text-neutral-400 hover:text-neutral-100'
              }`}
            >
              <it.icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : ''}`} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}

/* ── Shell principal ───────────────────────────────────────────────────── */

export function IdeShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const isDesktop = useIsDesktop();

  const mainLayout = useDefaultLayout({ id: 'ultraia-shell-main-v1', storage: STORAGE });
  const centerLayout = useDefaultLayout({ id: 'ultraia-shell-center-v1', storage: STORAGE });

  const explorerRef = useRef<PanelImperativeHandle>(null);
  const dockRef = useRef<PanelImperativeHandle>(null);
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [dockOpen, setDockOpen] = useState(true);

  // Sincroniza estado si el usuario arrastra el panel hasta el colapso manual.
  const onMainLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      const size = layout['explorer'];
      if (typeof size === 'number') setExplorerOpen(size > EXPLORER_CLOSED_PX);
    },
    [],
  );
  const onCenterLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      const size = layout['bottom'];
      if (typeof size === 'number') setDockOpen(size > DOCK_CLOSED_PX);
    },
    [],
  );

  const toggleExplorer = useCallback(() => {
    const panel = explorerRef.current;
    if (!panel) return;
    if (explorerOpen) panel.collapse();
    else panel.expand();
    setExplorerOpen(!explorerOpen);
  }, [explorerOpen]);

  const toggleDock = useCallback(() => {
    const panel = dockRef.current;
    if (!panel) return;
    if (dockOpen) panel.collapse();
    else panel.expand();
    setDockOpen(!dockOpen);
  }, [dockOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey || e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        toggleExplorer();
      } else if (key === 'j') {
        e.preventDefault();
        toggleDock();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleExplorer, toggleDock]);

  // Pre-hidratación: esqueleto del mismo color que el canvas (sin flash ni mismatch).
  if (isDesktop === null) {
    return <div className="h-screen w-screen bg-canvas" />;
  }

  if (!isDesktop) {
    return <MobileShell userName={userName}>{children}</MobileShell>;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-canvas text-neutral-100">
      <div aria-hidden className="aurora-bg pointer-events-none absolute inset-0 opacity-60" />
      <IdeRail
        userName={userName}
        explorerOpen={explorerOpen}
        dockOpen={dockOpen}
        onToggleExplorer={toggleExplorer}
        onToggleDock={toggleDock}
      />
      <Group
        orientation="horizontal"
        id="ultraia-shell-main"
        className="relative z-10 min-w-0 flex-1"
        defaultLayout={mainLayout.defaultLayout}
        onLayoutChanged={onMainLayoutChanged}
      >
        <Panel
          id="explorer"
          collapsible
          collapsedSize={0}
          defaultSize={232}
          minSize={188}
          maxSize={420}
          panelRef={explorerRef}
          className="h-full"
        >
          <IdeExplorer userName={userName} />
        </Panel>
        <Separator className={`ide-sep ide-sep-col ${explorerOpen ? '' : 'pointer-events-none opacity-0'}`} />
        <Panel id="center" minSize="30" className="min-w-0">
          <Group
            orientation="vertical"
            id="ultraia-shell-center"
            className="h-full"
            defaultLayout={centerLayout.defaultLayout}
            onLayoutChanged={onCenterLayoutChanged}
          >
            <Panel id="content" minSize="20" className="overflow-y-auto">
              <div className="mx-auto w-full max-w-6xl px-8 py-10">{children}</div>
            </Panel>
            <Separator
              className={`ide-sep ide-sep-row ${dockOpen ? '' : 'pointer-events-none opacity-0'}`}
            />
            <Panel
              id="bottom"
              collapsible
              collapsedSize={0}
              defaultSize="22"
              minSize="12"
              maxSize="45"
              panelRef={dockRef}
              className="h-full"
            >
              <IdeDock />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}
