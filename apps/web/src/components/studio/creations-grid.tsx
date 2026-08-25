'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Music, Play, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseMeta, postJson, type AssetRecord } from './types';

const MEDIA_TABS = ['todos', 'image', 'music', 'video', 'design', 'text'] as const;

const TYPE_LABEL: Record<string, string> = {
  image: 'Imagen',
  music: 'Música',
  audio: 'Audio',
  video: 'Vídeo',
  design: 'Diseño',
  text: 'Nota',
  tts: 'TTS',
};

/** Grid multi-media "Mis creaciones" del Studio (reproducir/descargar/eliminar). */
export function CreationsGrid({ refreshKey }: { refreshKey: number }) {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof MEDIA_TABS)[number]>('todos');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/library/assets?take=100');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items: AssetRecord[] };
      setAssets(data.items);
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo cargar la biblioteca');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const filtered = tab === 'todos' ? assets : assets.filter((a) => a.mediaType === tab);
  // Cadena de derivados (loop-106): mapa id→prompt para etiquetar hijos.
  const byId = new Map(assets.map((a) => [a.id, a] as const));

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAssets((p) => p.filter((a) => a.id !== id));
      toast.success('Eliminado');
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo eliminar');
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {MEDIA_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors duration-150 ${
              tab === t
                ? 'border-primary/60 bg-primary/15 text-violet-200'
                : 'border-border-subtle bg-panel text-neutral-400 hover:border-primary/50 hover:text-neutral-200'
            }`}
          >
            {t === 'todos' ? `Todos (${assets.length})` : `${TYPE_LABEL[t] ?? t} (${assets.filter((a) => a.mediaType === t).length})`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border-muted px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-neutral-300 transition-colors duration-150 hover:border-primary/60 hover:text-primary"
        >
          <RefreshCw className="h-3 w-3" /> Refrescar
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-border-subtle bg-panel" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle p-8 text-center">
          <p className="text-sm text-neutral-400">
            Aún no hay creaciones guardadas. Genera algo en la pestaña <span className="text-primary">Crear</span> y pulsa Guardar.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a, i) => (
            <AssetCard
              key={a.id}
              asset={a}
              index={i}
              onRemove={() => remove(a.id)}
              parentPrompt={a.parentId ? byId.get(a.parentId)?.prompt : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetCard({
  asset,
  index,
  onRemove,
  parentPrompt,
}: {
  asset: AssetRecord;
  index: number;
  onRemove: () => void;
  parentPrompt?: string;
}) {
  const meta = parseMeta(asset);
  const filters = typeof meta.filters === 'string' ? (meta.filters as string) : '';
  const isAudio = asset.mediaType === 'music' || asset.mediaType === 'audio' || asset.mediaType === 'tts';

  return (
    <figure
      style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
      className="card-glow-hover flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-panel [animation:var(--animate-chat-enter)]"
    >
      <div className="relative min-h-36 flex-1 bg-black/30">
        {asset.mediaType === 'image' || asset.mediaType === 'design' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt={asset.prompt} className="h-full max-h-56 w-full object-cover" style={{ filter: filters }} />
        ) : isAudio ? (
          <div className="flex h-full min-h-36 items-center justify-center p-3">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls preload="none" src={asset.url} className="w-full" />
          </div>
        ) : asset.mediaType === 'video' && asset.url ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video controls preload="metadata" src={asset.url} className="h-full max-h-56 w-full object-cover" />
        ) : asset.mediaType === 'text' ? (
          <div className="flex h-full min-h-36 items-center justify-center p-4">
            <p className="line-clamp-6 whitespace-pre-wrap text-xs text-neutral-400">{asset.prompt}</p>
          </div>
        ) : (
          <div className="flex h-full min-h-36 items-center justify-center p-4">
            <Play className="h-6 w-6 text-neutral-600" />
            <p className="ml-2 line-clamp-4 text-xs text-neutral-400">{asset.prompt}</p>
          </div>
        )}
      </div>
      <figcaption className="space-y-1.5 border-t border-border-subtle p-2.5">
        <p className="line-clamp-2 text-xs text-neutral-300">{asset.prompt}</p>
        {parentPrompt && (
          <p
            title={`Derivado de: ${parentPrompt}`}
            className="truncate font-mono text-[9px] uppercase tracking-widest text-primary/80"
          >
            ↳ derivado de: {parentPrompt}
          </p>
        )}
        <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-neutral-500">
          <span>{TYPE_LABEL[asset.mediaType] ?? asset.mediaType}</span>
          <span>·</span>
          <span>{asset.provider}</span>
          {asset.storage === 'cloud' && (
            <>
              <span>·</span>
              <span className="text-primary">durable</span>
            </>
          )}
          {typeof meta.bpm === 'number' && (
            <>
              <span>·</span>
              <span>{String(meta.bpm)} bpm</span>
            </>
          )}
        </div>
        <div className="flex gap-1.5 pt-0.5">
          {!isAudio && asset.url && !asset.url.endsWith('.html') && (
            <a
              href={asset.mediaType === 'video' && asset.url.startsWith('/') ? asset.url : `/api/assets/${asset.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border-muted px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-neutral-300 transition-colors duration-150 hover:border-primary/60 hover:text-primary"
            >
              <Play className="h-3 w-3" /> Abrir
            </a>
          )}
          {asset.storage === 'cloud' && (
            <a
              href={`/api/assets/${asset.id}/download`}
              download
              className="inline-flex items-center gap-1 rounded-md border border-border-muted px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-neutral-300 transition-colors duration-150 hover:border-primary/60 hover:text-primary"
            >
              <Download className="h-3 w-3" /> Descargar
            </a>
          )}
          {asset.mediaType === 'music' && typeof meta.bpm !== 'number' && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border-muted px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-neutral-500">
              <Music className="h-3 w-3" /> plan
            </span>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label="Eliminar"
            className="ml-auto rounded-md border border-destructive/30 p-1 text-red-300 transition-colors duration-150 hover:bg-destructive/10"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </figcaption>
    </figure>
  );
}

export async function deriveAsset<T>(assetId: string | null, body: Record<string, unknown>): Promise<T> {
  return postJson<T>(`/api/assets/${assetId ?? 'new'}/derive`, body);
}
