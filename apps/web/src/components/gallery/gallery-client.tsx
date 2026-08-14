'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, Images, Plus, RefreshCw, Search, Star, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/ui/stat-card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ContributeDialog } from './contribute-dialog';
import { DetailDialog } from './detail-dialog';
import { GenerateDrawer } from './generate-drawer';
import { PromptCard } from './prompt-card';
import { CATEGORIES, aspectStyle, type AssetItem, type PromptItem } from './types';

const PAGE_SIZE = 24;
const ENTRY_DELAY_CAP = 480;
const SKELETON_RATIOS = ['1 / 1', '3 / 4', '4 / 5', '9 / 16', '16 / 9'];

interface DetailState {
  item: PromptItem;
  sourcePromptId: string | null;
}

export function GalleryClient() {
  const [items, setItems] = useState<PromptItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [category, setCategory] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  const [drawer, setDrawer] = useState<{ open: boolean; prompt: string; sourcePromptId: string | null }>({
    open: false,
    prompt: '',
    sourcePromptId: null,
  });
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [contributeOpen, setContributeOpen] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextCursorRef = useRef<string | null>(null);
  const initialLoadingRef = useRef(true);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  useEffect(() => {
    initialLoadingRef.current = initialLoading;
  }, [initialLoading]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const fetchPrompts = useCallback(
    async (cursor: string | null) => {
      const params = new URLSearchParams({ take: String(PAGE_SIZE) });
      if (debouncedQ) params.set('q', debouncedQ);
      if (category) params.set('category', category);
      if (favoritesOnly) params.set('favorites', '1');
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/library/prompts?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('unauthorized');
      }
      if (!res.ok) throw new Error(`API ${res.status}`);
      return res.json() as Promise<{ items: PromptItem[]; nextCursor: string | null; total: number }>;
    },
    [debouncedQ, category, favoritesOnly],
  );

  const reload = useCallback(async () => {
    setInitialLoading(true);
    setError(null);
    setItems([]);
    setNextCursor(null);
    try {
      const data = await fetchPrompts(null);
      setItems(data.items);
      setNextCursor(data.nextCursor);
      setTotal(data.total);
      if (!debouncedQ && !category && !favoritesOnly) setTotalAll(data.total);
    } catch (e) {
      if ((e as Error).message !== 'unauthorized') setError('No se pudo cargar la galería');
    } finally {
      setInitialLoading(false);
    }
  }, [fetchPrompts, debouncedQ, category, favoritesOnly]);

  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 });
    void reload();
  }, [reload, refreshKey]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || initialLoadingRef.current) return;
    const cursor = nextCursorRef.current;
    if (!cursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchPrompts(cursor);
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setTotal(data.total);
    } catch {
      toast.error('No se pudieron cargar más prompts');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchPrompts]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const loadAssets = useCallback(async () => {
    setAssetsLoading(true);
    try {
      const res = await fetch('/api/library/assets');
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as { items: AssetItem[] };
      setAssets(data.items);
    } catch {
      toast.error('No se pudieron cargar tus creaciones');
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/library/prompts?favorites=1&take=1');
        if (res.ok) {
          const data = (await res.json()) as { total: number };
          setFavCount(data.total);
        }
      } catch {
        // stats are best-effort
      }
    })();
  }, []);

  const toggleFavorite = useCallback(
    async (item: PromptItem) => {
      const next = !item.isFavorite;
      setItems((prev) =>
        prev
          .map((p) => (p.id === item.id ? { ...p, isFavorite: next } : p))
          .filter((p) => !(favoritesOnly && p.id === item.id && !next)),
      );
      setFavCount((c) => Math.max(0, c + (next ? 1 : -1)));
      try {
        const res = await fetch('/api/library/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promptId: item.id }),
        });
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = (await res.json()) as { favorite: boolean };
        if (data.favorite !== next) throw new Error('mismatch');
      } catch {
        setItems((prev) =>
          prev.some((p) => p.id === item.id)
            ? prev.map((p) => (p.id === item.id ? { ...p, isFavorite: !next } : p))
            : [{ ...item, isFavorite: !next }, ...prev],
        );
        setFavCount((c) => Math.max(0, c - (next ? 1 : -1)));
        toast.error('No se pudo actualizar el favorito');
      }
    },
    [favoritesOnly],
  );

  const openDrawer = useCallback((prompt: string, sourcePromptId: string | null) => {
    setDrawer({ open: true, prompt, sourcePromptId });
  }, []);

  const assetToPrompt = useCallback(
    (a: AssetItem): PromptItem => ({
      id: a.id,
      prompt: a.prompt,
      category: 'Custom',
      tags: '[]',
      models: JSON.stringify([a.model]),
      aspectRatio: a.width && a.height ? `${a.width}:${a.height}` : '1:1',
      imageUrl: a.url,
      sourceUrl: null,
      engagementRank: 0,
      isUserSubmitted: true,
      useCount: 0,
      createdAt: a.createdAt,
      isFavorite: false,
    }),
    [],
  );

  const skeletonCards = (count: number) =>
    Array.from({ length: count }, (_, i) => (
      <div key={`sk-${i}`} className="mb-4 break-inside-avoid">
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-panel">
          <div
            className="shimmer w-full"
            style={{ aspectRatio: SKELETON_RATIOS[i % SKELETON_RATIOS.length] }}
          />
          <div className="space-y-2 p-3">
            <div className="shimmer h-2.5 w-16 rounded" />
            <div className="shimmer h-3 w-full rounded" />
            <div className="shimmer h-3 w-3/4 rounded" />
          </div>
        </div>
      </div>
    ));

  const chipCls = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-all duration-150',
      active
        ? 'border-primary bg-primary/15 text-white shadow-[0_0_14px_-6px_rgba(139,92,246,0.6)]'
        : 'border-border-subtle bg-panel text-neutral-500 hover:border-border-muted hover:text-neutral-300',
    );

  const filtersActive = Boolean(debouncedQ || category || favoritesOnly);

  return (
    <div className="mt-8 space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Prompts en la galería',
            value: totalAll,
            hint: 'catálogo completo',
            icon: <Images className="h-4 w-4" />,
          },
          {
            label: 'Mis creaciones',
            value: assets.length,
            hint: 'imágenes generadas',
            icon: <Star className="h-4 w-4" />,
          },
          {
            label: 'Favoritos',
            value: favCount,
            hint: 'guardados con ♥',
            icon: <Heart className="h-4 w-4" />,
          },
        ].map((s, i) => (
          <div
            key={s.label}
            className="card-glow-hover rounded-lg border border-transparent [animation:var(--animate-chat-enter)]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <StatCard label={s.label} value={s.value} hint={s.hint} icon={s.icon} />
          </div>
        ))}
      </div>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">Librería</TabsTrigger>
          <TabsTrigger value="creations">Mis creaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="pt-5">
          <div className="glass-panel flex flex-col gap-3 rounded-xl p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar prompts, tags, categorías…"
                  className="border-border-muted bg-input-active pl-9 transition-colors duration-150 hover:border-border-active focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  Solo favoritos
                </span>
                <Switch checked={favoritesOnly} onCheckedChange={setFavoritesOnly} label="Solo favoritos" />
              </div>
              <Button onClick={() => setContributeOpen(true)} className="ml-auto">
                <Plus className="h-4 w-4" /> Contribuir
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setCategory('')} className={chipCls(!category)}>
                Todos
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c === category ? '' : c)}
                  className={chipCls(category === c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            {initialLoading ? (
              <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
                {skeletonCards(8)}
              </div>
            ) : error ? (
              <EmptyState
                icon={<RefreshCw className="h-8 w-8" />}
                title="No se pudo cargar la galería"
                description="Revisa tu conexión e inténtalo de nuevo."
                action={
                  <Button variant="secondary" onClick={() => void reload()}>
                    <RefreshCw className="h-4 w-4" /> Reintentar
                  </Button>
                }
              />
            ) : items.length === 0 ? (
              <EmptyState
                title="Sin resultados"
                description={
                  filtersActive
                    ? 'Ningún prompt coincide con la búsqueda o los filtros actuales.'
                    : 'La galería está vacía por ahora.'
                }
                action={
                  filtersActive ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setQ('');
                        setDebouncedQ('');
                        setCategory('');
                        setFavoritesOnly(false);
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    className="mb-4 break-inside-avoid [animation:var(--animate-chat-enter)]"
                    style={{ animationDelay: `${Math.min(i * 60, ENTRY_DELAY_CAP)}ms` }}
                  >
                    <PromptCard
                      item={item}
                      onToggleFavorite={toggleFavorite}
                      onDetail={(it) => setDetail({ item: it, sourcePromptId: it.id })}
                      onUse={(it) => openDrawer(it.prompt, it.id)}
                    />
                  </div>
                ))}
                {loadingMore && skeletonCards(4)}
              </div>
            )}
            <div ref={sentinelRef} className="h-px" aria-hidden />
          </div>
        </TabsContent>

        <TabsContent value="creations" className="pt-5">
          {assetsLoading ? (
            <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
              {skeletonCards(6)}
            </div>
          ) : assets.length === 0 ? (
            <EmptyState
              icon={<Star className="h-8 w-8" />}
              title="Todavía no generaste imágenes"
              description="Genera desde cualquier prompt de la librería y aparecerán aquí."
              action={
                <Button onClick={() => openDrawer('', null)}>
                  <Zap className="h-4 w-4" /> Generar imagen
                </Button>
              }
            />
          ) : (
            <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
              {assets.map((a, i) => (
                <div
                  key={a.id}
                  className="mb-4 break-inside-avoid [animation:var(--animate-chat-enter)]"
                  style={{ animationDelay: `${Math.min(i * 60, ENTRY_DELAY_CAP)}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => setDetail({ item: assetToPrompt(a), sourcePromptId: a.sourcePromptId })}
                    className="card-glow-hover group block w-full overflow-hidden rounded-xl border border-border-subtle bg-panel text-left"
                  >
                    <div className="relative overflow-hidden" style={aspectStyle(`${a.width}:${a.height}`)}>
                      <img
                        src={a.url}
                        alt={a.prompt}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="space-y-1.5 p-3">
                      <p className="line-clamp-2 text-[13px] leading-snug text-neutral-300">{a.prompt}</p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                        {a.provider} · {a.model}
                      </p>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <GenerateDrawer
        open={drawer.open}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        initialPrompt={drawer.prompt}
        sourcePromptId={drawer.sourcePromptId}
        onSaved={() => void loadAssets()}
      />
      <DetailDialog
        item={detail?.item ?? null}
        sourcePromptId={detail?.sourcePromptId ?? null}
        onClose={() => setDetail(null)}
        onUse={(item, srcId) => {
          setDetail(null);
          openDrawer(item.prompt, srcId);
        }}
      />
      <ContributeDialog
        open={contributeOpen}
        onClose={() => setContributeOpen(false)}
        onSubmitted={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}