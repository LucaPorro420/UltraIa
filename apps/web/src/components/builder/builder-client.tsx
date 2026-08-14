'use client';

import { useEffect, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import {
  Code2,
  Copy,
  GripVertical,
  Monitor,
  MousePointer2,
  Redo2,
  Smartphone,
  SquareDashedMousePointer,
  Tablet,
  Trash2,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { BLOCK_DEFS, BlockBody, blockChildren, createBlock, isContainerType, uid } from './blocks';
import type { BuilderElement, BlockType } from './blocks';
import { PropertyPanel } from './property-panel';
import { ExportModal } from './export-modal';

/* ============================================================
   UltraIa Builder — lienzo drag & drop, panel de propiedades,
   exportación de código. 100% cliente, persistencia local.
   ============================================================ */

const STORAGE_KEY = 'ultraia-builder-v1';
const HISTORY_CAP = 100;

type DeviceId = 'desktop' | 'tablet' | 'mobile';

const DEVICES: { id: DeviceId; label: string; icon: typeof Monitor; width: string }[] = [
  { id: 'desktop', label: 'Escritorio', icon: Monitor, width: 'min(100%, 1100px)' },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: '768px' },
  { id: 'mobile', label: 'Móvil', icon: Smartphone, width: '390px' },
];

interface DropTarget {
  parentId: string | null;
  index: number;
}

/* ---------- utilidades de árbol (inmutables) ---------- */

function withChildren(node: BuilderElement, children: BuilderElement[]): BuilderElement {
  return { ...node, props: { ...node.props, children } };
}

function pathOf(tree: BuilderElement[], id: string): number[] | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) return [i];
    const p = pathOf(blockChildren(tree[i]), id);
    if (p) return [i, ...p];
  }
  return null;
}

function childAt(tree: BuilderElement[], path: number[]): BuilderElement | null {
  let cur: BuilderElement[] = tree;
  for (let d = 0; d < path.length; d++) {
    const node = cur[path[d]];
    if (!node) return null;
    if (d === path.length - 1) return node;
    cur = blockChildren(node);
  }
  return null;
}

function insertAt(tree: BuilderElement[], path: number[], index: number, node: BuilderElement): BuilderElement[] {
  if (path.length === 0) {
    const arr = [...tree];
    arr.splice(Math.min(index, arr.length), 0, node);
    return arr;
  }
  const [head, ...rest] = path;
  return tree.map((n, i) =>
    i === head ? withChildren(n, insertAt(blockChildren(n), rest, index, node)) : n
  );
}

function removeAt(tree: BuilderElement[], path: number[]): BuilderElement[] {
  if (path.length === 1) return tree.filter((_, i) => i !== path[0]);
  const [head, ...rest] = path;
  return tree.map((n, i) =>
    i === head ? withChildren(n, removeAt(blockChildren(n), rest)) : n
  );
}

function updateAt(tree: BuilderElement[], path: number[], fn: (n: BuilderElement) => BuilderElement): BuilderElement[] {
  if (path.length === 1) return tree.map((n, i) => (i === path[0] ? fn(n) : n));
  const [head, ...rest] = path;
  return tree.map((n, i) =>
    i === head ? withChildren(n, updateAt(blockChildren(n), rest, fn)) : n
  );
}

function moveElement(tree: BuilderElement[], sourcePath: number[], target: DropTarget): BuilderElement[] | null {
  const node = childAt(tree, sourcePath);
  if (!node) return null;

  const targetParentPath = target.parentId ? pathOf(tree, target.parentId) : null;
  if (target.parentId && !targetParentPath) return null;

  if (targetParentPath) {
    const sp = sourcePath.join(',');
    const tp = targetParentPath.join(',');
    if (tp === sp || tp.startsWith(sp + ',')) return null;
  }

  const sourceIndex = sourcePath[sourcePath.length - 1];
  const sameParent = targetParentPath?.join(',') === sourcePath.slice(0, -1).join(',');
  let index = target.index;
  if (sameParent && sourceIndex < index) index -= 1;
  if (sameParent && index === sourceIndex) return null;

  const without = removeAt(tree, sourcePath);
  return insertAt(without, targetParentPath ?? [], index, node);
}

function cloneTree(el: BuilderElement): BuilderElement {
  const copy: BuilderElement = { ...el, id: uid(), props: { ...el.props } };
  if (Array.isArray(copy.props.children)) {
    copy.props.children = (el.props.children as BuilderElement[]).map(cloneTree);
  }
  return copy;
}

function countBlocks(list: BuilderElement[]): number {
  return list.reduce((n, el) => n + 1 + countBlocks(blockChildren(el)), 0);
}

function loadSaved(): { projectName: string; elements: BuilderElement[] } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { v?: number; projectName?: unknown; elements?: unknown };
    if (!data || !Array.isArray(data.elements)) return null;
    return {
      projectName: typeof data.projectName === 'string' ? data.projectName : 'Mi proyecto',
      elements: data.elements as BuilderElement[],
    };
  } catch {
    return null;
  }
}

/* ---------- piezas visuales pequeñas ---------- */

function PaneHeader({ label, badge }: { label: string; badge?: string | number }) {
  return (
    <div className="flex h-[38px] shrink-0 items-center gap-2 border-b border-border-subtle px-3">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-500">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto rounded border border-border-subtle bg-input-active px-1.5 py-0.5 font-mono text-[9px] text-neutral-500">
          {badge}
        </span>
      )}
    </div>
  );
}

function ToolBtn({
  onClick,
  disabled,
  title,
  children,
  danger = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-neutral-400',
        danger
          ? 'hover:bg-panel-hover hover:text-destructive'
          : 'hover:bg-panel-hover hover:text-white'
      )}
    >
      {children}
    </button>
  );
}

function DropLine({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute left-0 right-0 z-20 h-[2px] rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.6)]', className)} />
  );
}

/* ============================================================
   Componente principal
   ============================================================ */

export function BuilderClient() {
  const [initial] = useState(loadSaved);
  const [elements, setElements] = useState<BuilderElement[]>(() => initial?.elements ?? []);
  const [projectName, setProjectName] = useState<string>(() => initial?.projectName ?? 'Mi proyecto');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [past, setPast] = useState<BuilderElement[][]>([]);
  const [future, setFuture] = useState<BuilderElement[][]>([]);
  const [device, setDevice] = useState<DeviceId>('desktop');
  const [dragActive, setDragActive] = useState(false);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  /* ---------- historial (undo/redo) ---------- */

  const commit = (next: BuilderElement[], select?: string | null) => {
    setPast((p) => [...p.slice(-(HISTORY_CAP - 1)), elements]);
    setFuture([]);
    setElements(next);
    if (select !== undefined) setSelectedId(select);
  };

  const undo = () => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, elements]);
    setElements(prev);
    setSelectedId(null);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[future.length - 1];
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, elements]);
    setElements(next);
    setSelectedId(null);
  };

  /* ---------- mutaciones ---------- */

  const patchElement = (id: string, patch: Record<string, any>) => {
    const path = pathOf(elements, id);
    if (!path) return;
    commit(updateAt(elements, path, (n) => ({ ...n, props: { ...n.props, ...patch } })));
  };

  const duplicateElement = (id: string) => {
    const path = pathOf(elements, id);
    const node = childAt(elements, path ?? []);
    if (!path || !node) return;
    const copy = cloneTree(node);
    const next = insertAt(elements, path.slice(0, -1), path[path.length - 1] + 1, copy);
    commit(next, copy.id);
  };

  const removeElement = (id: string) => {
    const path = pathOf(elements, id);
    if (!path) return;
    commit(removeAt(elements, path), selectedIdRef.current === id ? null : undefined);
  };

  const removeSelected = () => {
    if (selectedIdRef.current) removeElement(selectedIdRef.current);
  };

  const clearAll = () => {
    if (!elements.length) return;
    if (window.confirm('¿Vaciar el lienzo? Se perderá el trabajo no exportado.')) {
      commit([], null);
    }
  };

  /* ---------- drag & drop ---------- */

  const startAdd = (e: DragEvent<HTMLButtonElement>, type: BlockType) => {
    e.dataTransfer.setData('text/ultraia-block', type);
    e.dataTransfer.effectAllowed = 'copy';
    setDragActive(true);
  };

  const startMove = (e: DragEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/ultraia-id', id);
    e.dataTransfer.effectAllowed = 'move';
    setDragActive(true);
  };

  const clearDrag = () => {
    setDragActive(false);
    setDropTarget(null);
  };

  const computeTarget = (e: DragEvent<HTMLElement>, el: BuilderElement, parentId: string | null, index: number): DropTarget => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    if (isContainerType(el.type) && y > h * 0.2 && y < h * 0.8) {
      return { parentId: el.id, index: blockChildren(el).length };
    }
    return y < h / 2 ? { parentId, index } : { parentId, index: index + 1 };
  };

  const handleDrop = (e: DragEvent<HTMLElement>, target: DropTarget) => {
    e.preventDefault();
    e.stopPropagation();
    const blockType = e.dataTransfer.getData('text/ultraia-block') as BlockType;
    const movingId = e.dataTransfer.getData('text/ultraia-id');

    if (blockType && BLOCK_DEFS.some((d) => d.type === blockType)) {
      const node = createBlock(blockType);
      const parentPath = target.parentId ? pathOf(elements, target.parentId) ?? [] : [];
      commit(insertAt(elements, parentPath, target.index, node), node.id);
    } else if (movingId) {
      const srcPath = pathOf(elements, movingId);
      const next = srcPath ? moveElement(elements, srcPath, target) : null;
      if (next) commit(next);
    }
    clearDrag();
  };

  /* ---------- atajos de teclado ---------- */

  const actionsRef = useRef({ undo, redo, removeSelected });
  actionsRef.current = { undo, redo, removeSelected };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        !!t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) actionsRef.current.redo();
        else actionsRef.current.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        actionsRef.current.redo();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdRef.current) {
        e.preventDefault();
        actionsRef.current.removeSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- persistencia (debounce 500ms) ---------- */

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, projectName, elements }));
      } catch {
        /* almacenamiento no disponible */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [elements, projectName]);

  /* ---------- render del lienzo ---------- */

  const renderList = (list: BuilderElement[], parentId: string | null, inGrid = false): ReactNode => {
    return list.map((el, index) => {
      const isContainer = isContainerType(el.type);
      const children = blockChildren(el);
      const selected = el.id === selectedId;
      const showBefore = dragActive && dropTarget?.parentId === parentId && dropTarget?.index === index;
      const showAfter = dragActive && dropTarget?.parentId === parentId && dropTarget?.index === index + 1;
      const dropInto = dragActive && dropTarget?.parentId === el.id;

      return (
        <div
          key={el.id}
          className={cn('group relative min-w-0', !inGrid && 'mb-3 last:mb-0')}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setSelectedId(el.id);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragActive) setDropTarget(computeTarget(e, el, parentId, index));
          }}
          onDrop={(e) => handleDrop(e, computeTarget(e, el, parentId, index))}
        >
          {showBefore && <DropLine className="top-0" />}
          <div
            className={cn(
              'relative rounded-lg transition-shadow duration-150',
              selected
                ? 'ring-2 ring-primary shadow-[0_0_28px_-10px_rgba(139,92,246,0.5)]'
                : 'hover:ring-1 hover:ring-primary/30 hover:shadow-[0_0_24px_-12px_rgba(139,92,246,0.35)]'
            )}
          >
            {dropInto && (
              <div className="pointer-events-none absolute inset-0 z-10 rounded-lg border-2 border-dashed border-primary bg-primary/5" />
            )}
            <BlockBody element={el}>{isContainer ? renderList(children, el.id) : undefined}</BlockBody>
            {selected && (
              <div
                className="absolute -top-8 right-0 z-30 flex items-center gap-0.5 rounded-md border border-border-subtle bg-panel-header px-1 py-0.5 shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => startMove(e, el.id)}
                  onDragEnd={clearDrag}
                  title="Arrastrar para mover"
                  className="cursor-grab rounded p-1 text-neutral-400 transition-colors duration-150 hover:bg-panel-hover hover:text-white active:cursor-grabbing"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => duplicateElement(el.id)}
                  title="Duplicar"
                  className="rounded p-1 text-neutral-400 transition-colors duration-150 hover:bg-panel-hover hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeElement(el.id)}
                  title="Eliminar"
                  className="rounded p-1 text-neutral-400 transition-colors duration-150 hover:bg-panel-hover hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          {showAfter && <DropLine className="bottom-0" />}
        </div>
      );
    });
  };

  const deviceWidth = DEVICES.find((d) => d.id === device)?.width ?? 'min(100%, 1100px)';
  const totalBlocks = countBlocks(elements);

  return (
    <div className="-mx-8 -my-10 flex h-screen flex-col overflow-hidden bg-canvas">
      {/* ---------- barra superior ---------- */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border-subtle bg-panel px-4 [animation:var(--animate-chat-enter)]">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15">
            <SquareDashedMousePointer className="h-3.5 w-3.5 text-primary" />
          </span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
            Builder
          </span>
        </div>
        <div className="h-5 w-px bg-border-subtle" />
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Nombre del proyecto"
          className="h-8 w-56 rounded-md border border-border-subtle bg-input-active px-2.5 font-mono text-[12px] text-neutral-200 outline-none transition-colors duration-150 placeholder:text-neutral-600 hover:border-border-muted focus:border-primary"
        />
        <div className="h-5 w-px bg-border-subtle" />
        <div className="flex items-center gap-1">
          <ToolBtn onClick={undo} disabled={!past.length} title="Deshacer (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={redo} disabled={!future.length} title="Rehacer (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </ToolBtn>
        </div>
        <ToolBtn onClick={clearAll} title="Vaciar lienzo" danger>
          <Trash2 className="h-4 w-4" />
        </ToolBtn>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-neutral-600 sm:block">
            {totalBlocks} {totalBlocks === 1 ? 'bloque' : 'bloques'}
          </span>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            disabled={!elements.length}
            className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 font-mono text-[11px] font-semibold text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.5)] transition-all duration-150 hover:bg-[#7c3aed] hover:shadow-[0_0_24px_-8px_rgba(139,92,246,0.65)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            <Code2 className="h-3.5 w-3.5" />
            Exportar
          </button>
        </div>
      </header>

      {/* ---------- cuerpo de 3 paneles ---------- */}
      <div className="flex min-h-0 flex-1">
        {/* paleta de bloques */}
        <aside className="glass-panel flex w-[280px] shrink-0 flex-col [animation:var(--animate-chat-enter)]">
          <PaneHeader label="Bloques" badge={BLOCK_DEFS.length} />
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-1.5">
              {BLOCK_DEFS.map((def) => {
                const Icon = def.icon;
                return (
                  <button
                    key={def.type}
                    type="button"
                    draggable
                    onDragStart={(e) => startAdd(e, def.type)}
                    onDragEnd={clearDrag}
                    title={`${def.hint} — arrastra al lienzo`}
                    className="card-glow-hover flex cursor-grab flex-col items-start gap-1 rounded-md border border-border-subtle bg-panel-header/70 px-2.5 py-2 text-left hover:border-primary/40 hover:bg-panel-hover active:cursor-grabbing"
                  >
                    <Icon className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="text-[11px] font-medium text-neutral-200">{def.label}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                      {def.type}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-t border-border-subtle p-2.5">
            <p className="font-mono text-[9px] leading-relaxed text-neutral-600">
              Arrastra un bloque al lienzo. Clic para editar sus propiedades. Supr para eliminar.
            </p>
          </div>
        </aside>

        {/* lienzo */}
        <main className="flex min-w-0 flex-1 flex-col bg-canvas">
          <div className="flex h-[38px] shrink-0 items-center gap-2 border-b border-border-subtle bg-panel px-3 [animation:var(--animate-chat-enter)]">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              Lienzo
            </span>
            <span className="hidden font-mono text-[9px] text-neutral-600 md:block">preview en vivo</span>
            <div className="ml-auto flex items-center gap-0.5 rounded-md border border-border-subtle bg-input-active p-0.5">
              {DEVICES.map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDevice(d.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors duration-150',
                      device === d.id
                        ? 'bg-primary/15 text-primary'
                        : 'text-neutral-500 hover:text-neutral-300'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden lg:inline">{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto"
            onClick={() => setSelectedId(null)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragActive) setDropTarget({ parentId: null, index: elements.length });
            }}
            onDrop={(e) => handleDrop(e, { parentId: null, index: elements.length })}
          >
            <div
              className="mx-auto min-h-full transition-[width] duration-200"
              style={{ width: deviceWidth, maxWidth: '100%' }}
            >
              <div className="grid-dots min-h-full p-8">
                {elements.length === 0 ? (
                  dragActive ? (
                    <div className="flex min-h-[50vh] items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 font-mono text-[12px] text-primary">
                      Suelta el bloque aquí
                    </div>
                  ) : (
                    <EmptyState
                      icon={<MousePointer2 className="h-8 w-8" />}
                      title="Lienzo vacío"
                      description="Arrastra bloques desde la paleta de la izquierda para empezar a construir tu página."
                    />
                  )
                ) : (
                  <>
                    {renderList(elements, null)}
                    {dragActive && dropTarget?.parentId === null && dropTarget.index >= elements.length && (
                      <div className="h-[2px] w-full rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* panel de propiedades */}
        <aside className="glass-panel flex w-[280px] shrink-0 flex-col [animation:var(--animate-chat-enter)]">
          <PaneHeader label="Propiedades" badge={selectedId ? 1 : undefined} />
          <PropertyPanel
            element={selectedId ? (childAt(elements, pathOf(elements, selectedId) ?? []) ?? null) : null}
            onPatch={patchElement}
            onDuplicate={duplicateElement}
            onDelete={removeElement}
          />
        </aside>
      </div>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        elements={elements}
        projectName={projectName}
      />
    </div>
  );
}