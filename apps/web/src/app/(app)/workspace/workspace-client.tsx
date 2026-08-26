'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  Bot,
  Images,
  BarChart3,
  Cloud,
  SquareDashedMousePointer,
  Plus,
  X,
  MessageSquare,
} from 'lucide-react';
import { AgentChat } from '@/components/agent-chat';

/**
 * Workspace multi-panel (F2 del IDE V0.1):
 *  - cada panel = una vista independiente (chat de agente con modo, gallery, builder, métricas, cloud)
 *  - splits horizontales reales (1-3 columnas) con react-resizable-panels v4
 *  - sesión persistida en localStorage (`ultraia-workspace-v1`)
 */

export interface AgentOption {
  id: string;
  name: string;
  taskDescription: string | null;
}

type ViewId = 'chat' | 'gallery' | 'builder' | 'metrics' | 'cloud';

const MODO_IDS = [
  'libre',
  'plan',
  'build',
  'test',
  'review',
  'ship',
  'simplify',
  'p-p',
  'p-b',
  'l-t',
  's-d',
] as const;
type ModoId = (typeof MODO_IDS)[number];

const MODO_LABEL: Record<ModoId, string> = {
  libre: 'Libre',
  plan: 'Plan',
  build: 'Build',
  test: 'Test',
  review: 'Review',
  ship: 'Ship',
  simplify: 'Simplify',
  'p-p': 'P-P · Planificar',
  'p-b': 'P-B · Construir',
  'l-t': 'L-T · Aprender-Probar',
  's-d': 'S-D · Especificar',
};

interface Pane {
  id: string;
  view: ViewId;
  agentId?: string;
  modo?: ModoId;
}

const VIEW_META: Record<ViewId, { label: string; icon: typeof Bot }> = {
  chat: { label: 'Chat', icon: MessageSquare },
  gallery: { label: 'Gallery', icon: Images },
  builder: { label: 'Builder', icon: SquareDashedMousePointer },
  metrics: { label: 'Métricas', icon: BarChart3 },
  cloud: { label: 'Cloud', icon: Cloud },
};

const STORAGE_KEY = 'ultraia-workspace-v1';
const MAX_PANES = 3;

function loadPanes(): Pane[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pane[];
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > MAX_PANES) return null;
    return parsed.filter((p) => p && typeof p.id === 'string' && p.view in VIEW_META);
  } catch {
    return null;
  }
}

/* ── Vistas pesadas: carga diferida solo si existe un panel para ellas ─── */

function PaneSkeleton() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-xs text-neutral-600">
      <span className="shimmer h-2.5 w-24 rounded" /> Cargando vista…
    </div>
  );
}

const GalleryClient = dynamic(
  () => import('@/components/gallery/gallery-client').then((m) => m.GalleryClient),
  { loading: () => <PaneSkeleton />, ssr: false },
);
const BuilderClient = dynamic(
  () => import('@/components/builder/builder-client').then((m) => m.BuilderClient),
  { loading: () => <PaneSkeleton />, ssr: false },
);
const MetricsClient = dynamic(() => import('@/components/metrics-client').then((m) => m.MetricsClient), {
  loading: () => <PaneSkeleton />,
  ssr: false,
});
const CloudClient = dynamic(() => import('@/components/cloud-client').then((m) => m.CloudClient), {
  loading: () => <PaneSkeleton />,
  ssr: false,
});

/* ── Selector compacto (select nativo estilizado dark) ─────────────────── */

function PaneSelect({
  value,
  onChange,
  title,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      title={title}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-[10rem] truncate rounded-md border border-border-subtle bg-input-active px-2 py-1 font-mono text-[11px] text-neutral-200 outline-none transition-colors duration-150 hover:border-border-muted focus:border-border-active"
    >
      {children}
    </select>
  );
}

/* ── Contenido por vista ───────────────────────────────────────────────── */

function PaneBody({ pane, agents }: { pane: Pane; agents: AgentOption[] }) {
  switch (pane.view) {
    case 'chat': {
      const agent = agents.find((a) => a.id === pane.agentId);
      if (!agent) {
        return (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Bot className="h-6 w-6 text-neutral-600" />
            <p className="text-sm text-neutral-500">Elige un agente para este panel.</p>
            <Link
              href="/agents/new"
              className="text-xs text-primary transition-colors duration-150 hover:text-primary/85"
            >
              Crear agente →
            </Link>
          </div>
        );
      }
      return (
        <div className="flex h-full flex-col">
          {agent.taskDescription && (
            <p className="mb-2 line-clamp-2 text-[11px] text-neutral-500">{agent.taskDescription}</p>
          )}
          <div className="min-h-0 flex-1">
            <AgentChat agentId={agent.id} extraBody={{ modo: pane.modo ?? 'libre' }} />
          </div>
        </div>
      );
    }
    case 'gallery':
      return <GalleryClient />;
    case 'builder':
      return <BuilderClient />;
    case 'metrics':
      return <MetricsClient />;
    case 'cloud':
      return <CloudClient />;
    default:
      return null;
  }
}

/* ── Marco de un panel ─────────────────────────────────────────────────── */

function PaneFrame({
  pane,
  agents,
  onAgentChange,
  onModoChange,
  onClose,
}: {
  pane: Pane;
  agents: AgentOption[];
  onAgentChange: (agentId: string) => void;
  onModoChange: (modo: ModoId) => void;
  onClose: () => void;
}) {
  const meta = VIEW_META[pane.view];
  const Icon = meta.icon;
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-panel/70 transition-shadow duration-200 focus-within:border-primary/60 focus-within:shadow-[0_0_0_1px_rgba(139,92,246,0.45),0_0_24px_-12px_rgba(139,92,246,0.5)]">
      <header className="flex h-[34px] shrink-0 items-center gap-2 border-b border-border-subtle bg-panel-header px-2.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-300">
          {meta.label}
        </span>
        {pane.view === 'chat' && (
          <>
            <PaneSelect
              title="Agente de este panel"
              value={pane.agentId ?? ''}
              onChange={onAgentChange}
            >
              {agents.length === 0 && <option value="">— sin agentes —</option>}
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </PaneSelect>
            <PaneSelect
              title="Modo de trabajo de este panel"
              value={pane.modo ?? 'libre'}
              onChange={(v) => onModoChange(v as ModoId)}
            >
              {MODO_IDS.map((m) => (
                <option key={m} value={m}>
                  {MODO_LABEL[m]}
                </option>
              ))}
            </PaneSelect>
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          title="Cerrar panel"
          className="ml-auto rounded p-1 text-neutral-500 transition-colors duration-150 hover:bg-panel-hover hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <PaneBody pane={pane} agents={agents} />
      </div>
    </div>
  );
}

/* ── Cliente principal ─────────────────────────────────────────────────── */

let paneSeq = 0;
function newPaneId(): string {
  paneSeq += 1;
  return `p-${Date.now().toString(36)}-${paneSeq}`;
}

/** <768px: apila los paneles en columna (el Group horizontal no cabe). */
function useIsNarrow(): boolean | null {
  const [narrow, setNarrow] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return narrow;
}

export function WorkspaceClient({
  userName,
  agents,
}: {
  userName: string;
  agents: AgentOption[];
}) {
  const [panes, setPanes] = useState<Pane[] | null>(null); // null = pre-hidratación
  const [addOpen, setAddOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const narrow = useIsNarrow();

  useEffect(() => {
    const stored = loadPanes();
    if (stored && stored.length > 0) setPanes(stored);
    else setPanes([{ id: newPaneId(), view: 'chat', agentId: agents[0]?.id, modo: 'libre' }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (panes) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(panes));
  }, [panes]);

  // Cierra el menú añadir al hacer clic fuera.
  useEffect(() => {
    if (!addOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [addOpen]);

  const updatePane = useCallback((id: string, patch: Partial<Pane>) => {
    setPanes((prev) => prev?.map((p) => (p.id === id ? { ...p, ...patch } : p)) ?? prev);
  }, []);

  const closePane = useCallback((id: string) => {
    setPanes((prev) => {
      const next = prev?.filter((p) => p.id !== id) ?? prev;
      return next && next.length > 0 ? next : [{ id: newPaneId(), view: 'chat', modo: 'libre' }];
    });
  }, []);

  const addPane = useCallback(
    (view: ViewId) => {
      setAddOpen(false);
      setPanes((prev) => {
        if (!prev || prev.length >= MAX_PANES) return prev;
        const base: Pane = { id: newPaneId(), view, modo: 'libre' };
        if (view === 'chat') base.agentId = agents[0]?.id;
        return [...prev, base];
      });
    },
    [agents],
  );

  const chatCount = useMemo(() => panes?.filter((p) => p.view === 'chat').length ?? 0, [panes]);

  // Children PLANOS para el Group: la librería requiere Panel/Separator directos.
  const groupChildren: ReactNode[] = [];
  if (panes !== null) {
    panes.forEach((pane, i) => {
      if (i > 0) {
        groupChildren.push(<Separator key={`sep-${pane.id}`} className="ide-sep ide-sep-col" />);
      }
      groupChildren.push(
        <Panel
          key={pane.id}
          id={pane.id}
          defaultSize={`${Math.floor(100 / panes.length)}`}
          minSize={260}
          className="h-full"
        >
          <PaneFrame
            pane={pane}
            agents={agents}
            onAgentChange={(agentId) => updatePane(pane.id, { agentId })}
            onModoChange={(modo) => updatePane(pane.id, { modo })}
            onClose={() => closePane(pane.id)}
          />
        </Panel>,
      );
    });
  }

  if (panes === null) {
    return <div className="h-[60vh]" aria-busy />;
  }

  const canAdd = panes.length < MAX_PANES;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">Workspace</h1>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            Hola {userName} — {panes.length} panel{panes.length !== 1 ? 'es' : ''} · arrastra los
            bordes para redimensionar · hasta {MAX_PANES} columnas
            {chatCount > 1 ? ` · ${chatCount} chats simultáneos` : ''}
          </p>
        </div>

        <div ref={addMenuRef} className="relative ml-auto">
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            disabled={!canAdd}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-150 ${
              canAdd
                ? 'border-primary/50 bg-panel text-neutral-100 hover:bg-panel-hover'
                : 'cursor-not-allowed border-border-subtle bg-input-active text-neutral-600'
            }`}
            title={canAdd ? 'Añadir panel' : `Máximo ${MAX_PANES} paneles`}
          >
            <Plus className="h-3.5 w-3.5" /> Panel
          </button>
          {addOpen && (
            <div className="absolute right-0 z-30 mt-1.5 w-44 overflow-hidden rounded-lg border border-border-subtle bg-panel shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7)]">
              {(Object.keys(VIEW_META) as ViewId[]).map((v) => {
                const Meta = VIEW_META[v];
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => addPane(v)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-neutral-300 transition-colors duration-150 hover:bg-panel-hover hover:text-white"
                  >
                    <Meta.icon className="h-3.5 w-3.5 text-primary" /> {Meta.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {agents.length === 0 && (
        <p className="rounded-lg border border-dashed border-border-muted bg-panel/40 px-4 py-3 text-xs text-neutral-500">
          Todavía no tienes agentes —{' '}
          <Link href="/agents/new" className="text-primary hover:text-primary/85">
            crea el primero
          </Link>{' '}
          y vuelve para abrir chats paralelos.
        </p>
      )}

      {narrow ? (
        // Móvil/tablet angosta: columna apilada, cada panel con altura útil.
        <div className="flex flex-col gap-3">
          {panes.map((pane) => (
            <div key={pane.id} className="h-[520px]">
              <PaneFrame
                pane={pane}
                agents={agents}
                onAgentChange={(agentId) => updatePane(pane.id, { agentId })}
                onModoChange={(modo) => updatePane(pane.id, { modo })}
                onClose={() => closePane(pane.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <Group
          orientation="horizontal"
          id="ultraia-workspace"
          className="h-[calc(100vh-13rem)] min-h-[420px]"
        >
          {groupChildren}
        </Group>
      )}
    </div>
  );
}
