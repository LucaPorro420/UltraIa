'use client';

import { useState, type ReactNode } from 'react';
import { useChat } from 'ai/react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import {
  Globe,
  Image as ImageIcon,
  Clapperboard,
  Music,
  MessageSquare,
  LayoutTemplate,
  ExternalLink,
  Megaphone,
  SendHorizontal,
  Square,
  RefreshCw,
  Wand2,
  Library,
  FlaskConical,
  Sparkles,
  FileText,
  Download as DownloadIcon,
  Cpu,
  Brain,
} from 'lucide-react';
import { toast } from 'sonner';
import { MarketingHeader } from '@/components/marketing-header';
import { AssetActions } from '@/components/studio/asset-actions';
import { StoryboardPlayer } from '@/components/studio/storyboard-player';
import { CreationsGrid, deriveAsset } from '@/components/studio/creations-grid';
import { OssLab } from '@/components/studio/oss-lab';
import { postJson, type AssetDraft } from '@/components/studio/types';

type Cap =
  | 'web'
  | 'image'
  | 'video'
  | 'music'
  | 'design'
  | 'branding'
  | 'chat'
  | 'orchestrator'
  | 'chat_memory';

const CAP_META: Record<Cap, { label: string; icon: typeof Globe; blurb: string }> = {
  web: { label: 'Web', icon: Globe, blurb: 'Read any public site or social post' },
  image: { label: 'Image', icon: ImageIcon, blurb: 'Generate photoreal images (keyless)' },
  video: { label: 'Video', icon: Clapperboard, blurb: 'Storyboard frames from a prompt' },
  music: { label: 'Music', icon: Music, blurb: 'Compose an original piece' },
  design: { label: 'Design', icon: LayoutTemplate, blurb: 'Generate UI screens (Google Stitch)' },
  branding: { label: 'Branding', icon: Megaphone, blurb: 'On-brand assets + Pomelli' },
  chat: { label: 'Chat', icon: MessageSquare, blurb: 'Multimodal assistant (needs AI key)' },
  orchestrator: {
    label: 'Orchestrator',
    icon: Cpu,
    blurb: 'Auto model+mode routing with failover (OpenRouter free)',
  },
  chat_memory: {
    label: 'Chat memory',
    icon: Brain,
    blurb: 'Persistent session + graph (graphity) for consistency',
  },
};

const ALL_CAPS: Cap[] = [
  'web',
  'image',
  'video',
  'music',
  'design',
  'branding',
  'chat',
  'orchestrator',
  'chat_memory',
];

const CONNECTORS = [
  { label: 'Google Flow', href: 'https://labs.google/fx/tools/flow', note: 'Veo video (50 free credits/day)' },
  { label: 'Pomelli', href: 'https://labs.google.com/pomelli', note: 'On-brand marketing (Google Labs)' },
  { label: 'X / Twitter', href: 'https://x.com/explore', note: 'Social listening (public posts)' },
];

const inputCls =
  'w-full rounded-lg border border-border-muted bg-input-active px-3 py-2.5 text-sm text-neutral-100 outline-none transition-colors duration-150 placeholder:text-neutral-600 focus:border-border-active focus:ring-1 focus:ring-border-active';
const btnCls =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary/85 disabled:opacity-50';
const chipCls =
  'rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest transition-colors duration-150';
const miniBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-border-muted px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-neutral-300 transition-colors duration-150 hover:border-primary/60 hover:text-primary disabled:opacity-40';

type StudioView = 'crear' | 'creaciones' | 'oss';

export function StudioClient({
  user,
  ossCatalog,
}: {
  user: { name?: string | null; email: string };
  ossCatalog: readonly import('@ultraia/core').OssEntry[];
}) {
  const [caps, setCaps] = useState<Record<Cap, boolean>>({
    web: true,
    image: true,
    video: true,
    music: true,
    design: true,
    branding: true,
    chat: true,
    orchestrator: false,
    chat_memory: false,
  });
  const [view, setView] = useState<StudioView>('crear');
  const [creationsKey, setCreationsKey] = useState(0);
  const toggle = (c: Cap) => setCaps((p) => ({ ...p, [c]: !p[c] }));
  const activeCaps = ALL_CAPS.filter((c) => caps[c] && c !== 'chat');

  const notifySaved = () => setCreationsKey((k) => k + 1);

  return (
    <div className="min-h-screen">
      <MarketingHeader user={user} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Multimodal workspace</p>
        <h1 className="mt-1.5 font-display text-[22px] font-bold tracking-tight">
          <span className="gradient-neo-text">Studio</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Combine multiple agents at once — web, image, video, music and chat — in one workspace. Everything you generate
          can be saved durably, played, downloaded and modified.
        </p>

        {/* Tabs del media hub (loop-104) */}
        <div className="glass-panel mt-5 inline-flex rounded-xl p-1">
          {(
            [
              { id: 'crear', label: 'Crear', icon: Sparkles },
              { id: 'creaciones', label: 'Creaciones', icon: Library },
              { id: 'oss', label: 'Open Source Lab', icon: FlaskConical },
            ] as { id: StudioView; label: string; icon: typeof Sparkles }[]
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-pressed={view === id}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all duration-150 ${
                view === id ? 'bg-primary/20 text-violet-200 shadow-[0_0_16px_-8px_rgba(139,92,246,0.6)]' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {view === 'creaciones' && (
          <section className="mt-6">
            <CreationsGrid refreshKey={creationsKey} />
          </section>
        )}

        {view === 'oss' && (
          <section className="mt-6">
            <OssLab catalog={ossCatalog} />
          </section>
        )}

        {view === 'crear' && (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              {ALL_CAPS.map((c, i) => {
                const Icon = CAP_META[c].icon;
                const on = caps[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggle(c)}
                    aria-pressed={on}
                    style={{ animationDelay: `${Math.min(i * 40, 280)}ms` }}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all duration-150 [animation:var(--animate-chat-enter)] ${
                      on
                        ? 'border-primary/60 bg-primary/15 text-violet-200 shadow-[0_0_16px_-8px_rgba(139,92,246,0.5)]'
                        : 'border-border-subtle bg-panel text-neutral-400 hover:border-primary/50 hover:bg-panel-hover hover:text-neutral-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {CAP_META[c].label}
                  </button>
                );
              })}
            </div>

            <div className="glass-panel mt-6 flex flex-wrap items-center gap-2 rounded-xl p-2.5 text-xs">
              <span className="px-1 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                Free external connectors:
              </span>
              {CONNECTORS.map((c) => (
                <a
                  key={c.href}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-full border border-border-muted px-3 py-1 text-neutral-300 transition-colors duration-150 hover:border-primary/60 hover:text-neutral-100"
                >
                  {c.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>

            <Group orientation="horizontal" className="mt-6">
              {caps.web && (
                <>
                  <Panel minSize={18} className="pr-1">
                    <WebPanel onSaved={notifySaved} />
                  </Panel>
                  <Separator className="resize-handle" />
                </>
              )}
              {caps.image && (
                <>
                  <Panel minSize={18} className="px-1">
                    <ImageGeneratorCard
                      title="Image generator"
                      glow="glow-video"
                      placeholder="a photoreal sunset over mountains, 35mm"
                      onSaved={notifySaved}
                    />
                  </Panel>
                  <Separator className="resize-handle" />
                </>
              )}
              {caps.video && (
                <>
                  <Panel minSize={18} className="px-1">
                    <VideoPanel onSaved={notifySaved} />
                  </Panel>
                  <Separator className="resize-handle" />
                </>
              )}
              {caps.music && (
                <>
                  <Panel minSize={18} className="px-1">
                    <MusicPanel onSaved={notifySaved} />
                  </Panel>
                  <Separator className="resize-handle" />
                </>
              )}
              {caps.design && (
                <>
                  <Panel minSize={18} className="px-1">
                    <DesignPanel onSaved={notifySaved} />
                  </Panel>
                  <Separator className="resize-handle" />
                </>
              )}
              {caps.branding && (
                <>
                  <Panel minSize={18} className="px-1">
                    <ImageGeneratorCard
                      title="Branding (Pomelli)"
                      glow="glow-video"
                      placeholder="on-brand product shot for a coffee brand"
                      promptPrefix="on-brand, professional product shot: "
                      extraLink={{ href: 'https://labs.google.com/pomelli', label: 'Open Pomelli (free Google Labs)' }}
                      onSaved={notifySaved}
                    />
                  </Panel>
                  <Separator className="resize-handle" />
                </>
              )}
              {caps.chat && (
                <Panel minSize={18} className="pl-1">
                  <ChatPanel key={activeCaps.join(',')} capabilities={activeCaps} />
                </Panel>
              )}
            </Group>
          </>
        )}
      </main>
    </div>
  );
}

function PanelButton({
  busy,
  busyLabel,
  onClick,
  disabled,
  children,
}: {
  busy: boolean;
  busyLabel: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button type="button" className={btnCls} disabled={disabled || busy} onClick={onClick}>
      {busy ? <span className="animate-pulse">{busyLabel}</span> : children}
    </button>
  );
}

function StudioCard({
  title,
  icon: Icon,
  glow,
  children,
}: {
  title: string;
  icon: typeof Globe;
  glow?: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-panel card-glow-hover overflow-hidden rounded-xl">
      <header className="flex h-ide-header items-center gap-2.5 border-b border-border-subtle px-3">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${glow ?? 'border-border-subtle'}`}>
          <Icon className="h-3.5 w-3.5 text-primary" />
        </span>
        <h2 className="font-display text-[11px] font-semibold tracking-wide text-neutral-200">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Export client-side con filtros (canvas + ctx.filter, loop-106)      */
/* ------------------------------------------------------------------ */

/** Slug minimalista para el nombre del archivo descargado. */
function fileSlug(prompt: string): string {
  return (
    prompt
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'imagen'
  );
}

/**
 * Aplica los filtros CSS elegidos sobre un canvas y descarga el PNG resultante.
 * Fail-soft: si el proveedor no manda CORS (taint del canvas), guía al usuario
 * hacia la descarga del binario original.
 */
async function downloadFiltered(url: string, filterCss: string, prompt: string): Promise<void> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('load'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('ctx');
    ctx.filter = filterCss;
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('blob');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fileSlug(prompt)}-filtros.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Imagen con filtros descargada');
  } catch {
    toast.error('El proveedor bloquea el export local — usa Descargar (original)');
  }
}

/* ------------------------------------------------------------------ */
/* Web reader                                                          */
/* ------------------------------------------------------------------ */

function WebPanel({ onSaved }: { onSaved?: () => void }) {
  const [url, setUrl] = useState('');
  const [engine, setEngine] = useState<'auto' | 'local'>('auto');
  const [data, setData] = useState<null | {
    title: string | null;
    description: string | null;
    ogImage: string | null;
    text: string;
    finalUrl: string;
    engine?: 'remote' | 'webharvest';
  }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await postJson('/api/tools/web', { url, engine }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Captura real de la web → asset durable (principio openbrowser, loop-107). */
  const [capturing, setCapturing] = useState(false);
  const capture = async () => {
    setCapturing(true);
    setError(null);
    try {
      const res = await postJson<{ ok: boolean; id?: string; hint?: string; error?: string }>(
        '/api/tools/web/screenshot',
        { url },
      );
      if (res.ok) {
        toast.success('Captura guardada en Creaciones');
        onSaved?.();
      } else {
        toast.error(res.hint ?? res.error ?? 'Captura falló');
      }
    } catch (e) {
      toast.error((e as Error).message.slice(0, 200));
    } finally {
      setCapturing(false);
    }
  };

  return (
    <StudioCard title="Web reader" icon={Globe} glow="glow-web">
      <div className="flex gap-2">
        <input className={inputCls} placeholder="https://example.com/article" value={url} onChange={(e) => setUrl(e.target.value)} />
        <PanelButton busy={busy} busyLabel="Fetching…" disabled={!url} onClick={run}>
          Fetch
        </PanelButton>
        <PanelButton busy={capturing} busyLabel="Capturing…" disabled={!url} onClick={capture}>
          Captura
        </PanelButton>
      </div>
      {/* Motor (loop-106): Auto = r.jina.ai + fallback OSS webharvest · Local = scraping 100% offline */}
      <div className="mt-2 flex items-center gap-1.5">
        {(['auto', 'local'] as const).map((eOpt) => (
          <button
            key={eOpt}
            type="button"
            aria-pressed={engine === eOpt}
            onClick={() => setEngine(eOpt)}
            title={eOpt === 'auto' ? 'Remoto keyless con fallback local' : 'WebHarvest local (pip install webharvest)'}
            className={`${chipCls} ${
              engine === eOpt
                ? 'border-primary/60 bg-primary/15 text-violet-200'
                : 'border-border-muted text-neutral-400 hover:border-primary/50'
            }`}
          >
            {eOpt === 'auto' ? 'Auto' : 'Local (OSS)'}
          </button>
        ))}
        {data?.engine && (
          <span className={`${chipCls} border-border-muted text-neutral-500`}>
            motor: {data.engine === 'webharvest' ? 'webharvest local' : 'remoto'}
          </span>
        )}
      </div>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {data && (
        <div className="mt-3 space-y-2">
          {data.ogImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.ogImage} alt={data.title ?? 'Page preview'} className="w-full rounded-lg border border-border-subtle" />
          )}
          {data.title && <p className="font-display text-sm font-semibold text-neutral-100">{data.title}</p>}
          {data.description && <p className="text-xs text-neutral-500">{data.description}</p>}
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-border-subtle bg-input-active p-3 font-mono text-[11px] leading-relaxed text-neutral-300">
            {data.text.slice(0, 4000)}
          </pre>
          <AssetActions
            compact
            draft={{
              prompt: data.title ?? url,
              url: data.finalUrl || url,
              provider: 'web-reader',
              model: '',
              mediaType: 'text',
              meta: { description: data.description, excerpt: data.text.slice(0, 1200), ogImage: data.ogImage },
            }}
            onSaved={() => onSaved?.()}
          />
        </div>
      )}
    </StudioCard>
  );
}

/* ------------------------------------------------------------------ */
/* Image generator (compartido por Image y Branding)                   */
/* ------------------------------------------------------------------ */

const IMAGE_FILTERS: { id: string; label: string; css: string }[] = [
  { id: 'grayscale', label: 'B/N', css: 'grayscale(1)' },
  { id: 'sepia', label: 'Sepia', css: 'sepia(0.85)' },
  { id: 'contrast', label: 'Contraste+', css: 'contrast(1.25)' },
  { id: 'bright', label: 'Luz+', css: 'brightness(1.15)' },
  { id: 'vivid', label: 'Vívido', css: 'saturate(1.5)' },
];

function ImageGeneratorCard({
  title,
  glow,
  placeholder,
  promptPrefix = '',
  extraLink,
  onSaved,
}: {
  title: string;
  glow?: string;
  placeholder: string;
  promptPrefix?: string;
  extraLink?: { href: string; label: string };
  onSaved?: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [data, setData] = useState<null | { url: string; model: string; seed: number; provider?: string }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const [rerolling, setRerolling] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await postJson('/api/tools/image', { prompt: `${promptPrefix}${prompt}`, imageUrl: sourceUrl || undefined }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleFilter = (id: string) =>
    setFilters((p) => (p.includes(id) ? p.filter((f) => f !== id) : [...p, id]));
  const filterCss = IMAGE_FILTERS.filter((f) => filters.includes(f.id)).map((f) => f.css).join(' ');

  const reroll = async () => {
    if (!data) return;
    setRerolling(true);
    setError(null);
    try {
      // Re-roll generativo img2img: usa el resultado como fuente de una nueva pasada.
      const next = await postJson<{ url: string; model: string; seed: number; provider?: string }>('/api/tools/image', {
        prompt: `${promptPrefix}${prompt}, refined variation of the reference`,
        imageUrl: data.url,
      });
      setData(next);
      toast.success('Variación generada');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRerolling(false);
    }
  };

  return (
    <StudioCard title={title} icon={ImageIcon} glow={glow}>
      <div className="flex gap-2">
        <input className={inputCls} placeholder={placeholder} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <PanelButton busy={busy} busyLabel="Generating…" disabled={!prompt} onClick={run}>
          Generate
        </PanelButton>
      </div>
      {!data && (
        <input
          className={`${inputCls} mt-2`}
          placeholder="Optional: source image URL to recreate as a photoreal photo"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
      )}
      {extraLink && (
        <a
          href={extraLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-primary transition-colors duration-150 hover:text-primary/85"
        >
          <ExternalLink className="h-3 w-3" /> {extraLink.label}
        </a>
      )}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {data && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.url} alt={prompt} className="w-full rounded-lg border border-border-subtle transition-all duration-200" style={{ filter: filterCss }} />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            {data.provider ?? 'pollinations'} · model: {data.model} · seed: {data.seed}
          </p>

          {/* Modificar: filtros CSS persistentes (se guardan en metaJson.filters) */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Modificar:</span>
            {IMAGE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filters.includes(f.id)}
                onClick={() => toggleFilter(f.id)}
                className={`${chipCls} ${
                  filters.includes(f.id)
                    ? 'border-primary/60 bg-primary/15 text-violet-200'
                    : 'border-border-muted text-neutral-400 hover:border-primary/50'
                }`}
              >
                {f.label}
              </button>
            ))}
            <button type="button" className={miniBtn} onClick={reroll} disabled={rerolling}>
              {rerolling ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Variación IA
            </button>
            {filters.length > 0 && (
              <button type="button" className={miniBtn} onClick={() => void downloadFiltered(data.url, filterCss, prompt)}>
                <DownloadIcon className="h-3 w-3" /> Descargar c/filtros
              </button>
            )}
          </div>

          <AssetActions
            draft={
              {
                prompt: `${promptPrefix}${prompt}`,
                url: data.url,
                provider: data.provider ?? 'pollinations',
                model: data.model,
                seed: data.seed,
                mediaType: 'image',
                parentId: undefined,
                meta: { ...(filters.length > 0 ? { filters: filterCss } : {}) },
              } satisfies AssetDraft
            }
            onSaved={() => onSaved?.()}
          />
        </div>
      )}
    </StudioCard>
  );
}

/* ------------------------------------------------------------------ */
/* Video storyboard                                                    */
/* ------------------------------------------------------------------ */

interface StoryboardData {
  kind: 'storyboard';
  frames: { url: string; caption: string }[];
  note: string;
}

function VideoPanel({ onSaved }: { onSaved?: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [frames, setFrames] = useState(3);
  const [data, setData] = useState<StoryboardData | null>(null);
  const [busy, setBusy] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setSavedId(null);
    try {
      setData(await postJson('/api/tools/video', { prompt, frames }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const renderMp4 = async () => {
    if (!data) return;
    setRendering(true);
    setError(null);
    try {
      const res = await deriveAsset<{ ok: boolean; childId?: string; error?: string; hint?: string }>(savedId, {
        op: 'video-slideshow',
        frames: data.frames,
        fps: 24,
        secondsPerFrame: 2,
        prompt,
        parentId: savedId ?? undefined,
      });
      if (res.ok && res.childId) {
        toast.success('MP4 generado y guardado en Creaciones');
        onSaved?.();
      } else {
        toast.error(res.error === 'ffmpeg no produjo salida' || res.hint?.includes('ffmpeg')
          ? 'ffmpeg no disponible aquí — usa el player slideshow o corre en local con ffmpeg'
          : res.error || 'Render falló');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRendering(false);
    }
  };

  return (
    <StudioCard title="Video storyboard" icon={Clapperboard} glow="glow-video">
      <div className="flex gap-2">
        <input className={inputCls} placeholder="a cat walking in the rain, cinematic" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <input
          type="number"
          min={1}
          max={8}
          value={frames}
          onChange={(e) => setFrames(Number(e.target.value))}
          className="w-16 rounded-lg border border-border-muted bg-input-active px-2 py-2.5 text-sm text-neutral-100 outline-none transition-colors duration-150 focus:border-border-active"
        />
        <PanelButton busy={busy} busyLabel="Rendering…" disabled={!prompt} onClick={run}>
          Render
        </PanelButton>
      </div>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {data && (
        <div className="mt-3 space-y-2">
          <StoryboardPlayer frames={data.frames} />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={miniBtn} onClick={renderMp4} disabled={!savedId || rendering}>
              {rendering ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Clapperboard className="h-3 w-3" />} Render MP4{!savedId && ' (guarda primero)'}
            </button>
            <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">{data.note}</span>
          </div>
          <AssetActions
            draft={{
              prompt,
              url: data.frames[0]?.url ?? '',
              provider: 'storyboard',
              model: '',
              mediaType: 'video',
              meta: { frames: data.frames, note: data.note },
            }}
            onSaved={(id) => {
              setSavedId(id);
              onSaved?.();
            }}
          />
        </div>
      )}
    </StudioCard>
  );
}

/* ------------------------------------------------------------------ */
/* Music composer (audio real keyless)                                 */
/* ------------------------------------------------------------------ */

const MOOD_OPTIONS = ['calm', 'euphoric', 'dark', 'epic', 'playful', 'melancholic', 'hopeful', 'mysterious'];

interface CompositionData {
  kind: 'composition';
  title: string;
  mood: string;
  genre: string;
  key: string;
  tempoBpm: number;
  sections: { name: string; description: string; lyrics?: string }[];
  productionNotes: string;
}

function MusicPanel({ onSaved }: { onSaved?: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [data, setData] = useState<CompositionData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modificación: overrides de resíntesis.
  const [bpm, setBpm] = useState(90);
  const [mood, setMood] = useState('calm');
  const [durationSec, setDurationSec] = useState(12);
  const [synthing, setSynthing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [realTrack, setRealTrack] = useState<null | { name: string; artist: string | null; preview: string; url: string }>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await postJson<CompositionData | ({ kind: 'track' } & Record<string, unknown>)>('/api/tools/music', { prompt });
      if (result.kind === 'composition') setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Resíntesis WAV keyless con parámetros elegidos → asset hijo reproducible. */
  const synthAudio = async () => {
    if (!data) return;
    setSynthing(true);
    try {
      const res = await deriveAsset<{ ok: boolean; childId: string; url: string; durationSec?: number; error?: string }>(null, {
        op: 'music-resynth',
        composition: { mood: data.mood, genre: data.genre, key: data.key, tempoBpm: data.tempoBpm, sections: data.sections.map((s) => ({ name: s.name })) },
        overrides: { bpm, mood, durationSec },
      });
      if (res.ok) {
        setAudioUrl(res.url);
        toast.success(`Audio generado (${res.durationSec ?? durationSec}s)`);
        onSaved?.();
      } else toast.error(res.error ?? 'Resíntesis falló');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSynthing(false);
    }
  };

  /** Pista real keyless (Tunetank) — búsqueda de una palabra (lección verificada). */
  const searchReal = async () => {
    setSearching(true);
    try {
      const query = (prompt.trim().split(/\s+/)[0] || 'chill').toLowerCase();
      const res = await postJson<{ tracks?: { name: string; artist: string | null; preview: string; url: string }[] }>(
        '/api/tools/content/music',
        { query, maxResults: 3 },
      );
      const first = res.tracks?.[0];
      if (first?.preview) {
        setRealTrack(first);
        toast.success(`Pista real: ${first.name}`);
      } else toast.error('Sin resultados — prueba otra palabra clave');
    } catch {
      toast.error('Búsqueda no disponible (endpoint content)');
    } finally {
      setSearching(false);
    }
  };

  return (
    <StudioCard title="Music composer" icon={Music} glow="glow-audio">
      <div className="flex gap-2">
        <input className={inputCls} placeholder="a calm lo-fi track for focusing" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <PanelButton busy={busy} busyLabel="Composing…" disabled={!prompt} onClick={run}>
          Compose
        </PanelButton>
      </div>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {data && (
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="font-display text-sm font-semibold text-neutral-100">{data.title}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              {data.mood} · {data.genre} · {data.key} · {data.tempoBpm} BPM
            </p>
          </div>

          <ul className="space-y-1">
            {data.sections.map((s, i) => (
              <li
                key={i}
                style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
                className="rounded-lg border border-border-subtle bg-input-active p-2 transition-colors duration-150 hover:border-primary/40 hover:bg-panel-hover [animation:var(--animate-chat-enter)]"
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">{s.name}</span>
                <span className="ml-2 text-xs text-neutral-400">{s.description}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500">{data.productionNotes}</p>

          {/* Modificar: BPM / mood / duración → WAV real keyless */}
          <div className="space-y-2 rounded-lg border border-border-subtle bg-panel-hover/40 p-2.5">
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500">Modificar y reproducir (audio real)</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-neutral-500">
                BPM
                <input type="number" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-16 rounded border border-border-muted bg-input-active px-1.5 py-1 text-xs text-neutral-100 outline-none" />
              </label>
              <select value={mood} onChange={(e) => setMood(e.target.value)} className="rounded border border-border-muted bg-input-active px-1.5 py-1 text-xs text-neutral-100 outline-none">
                {MOOD_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-neutral-500">
                Seg
                <input type="number" min={2} max={30} value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} className="w-14 rounded border border-border-muted bg-input-active px-1.5 py-1 text-xs text-neutral-100 outline-none" />
              </label>
              <button type="button" className={miniBtn} onClick={synthAudio} disabled={synthing}>
                {synthing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Music className="h-3 w-3" />} Generar audio
              </button>
              <button type="button" className={miniBtn} onClick={searchReal} disabled={searching || !prompt}>
                {searching ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Buscar pista real
              </button>
            </div>
            {audioUrl && (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <audio controls src={audioUrl} className="w-full" preload="metadata" />
            )}
            {realTrack?.preview && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                <p className="font-mono text-[9px] uppercase tracking-widest text-primary">
                  Tunetank: {realTrack.name}
                  {realTrack.artist ? ` — ${realTrack.artist}` : ''}
                </p>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls src={realTrack.preview} className="mt-1 w-full" preload="none" />
                <a href={realTrack.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-mono text-[9px] uppercase tracking-widest text-neutral-500 underline-offset-2 hover:underline">
                  Abrir página de la pista
                </a>
              </div>
            )}
          </div>

          {!audioUrl ? (
            <AssetActions
              draft={{
                prompt: data.title || prompt,
                url: '',
                provider: 'composition',
                model: '',
                mediaType: 'music',
                meta: {
                  composition: {
                    mood: data.mood,
                    genre: data.genre,
                    key: data.key,
                    tempoBpm: data.tempoBpm,
                    sections: data.sections.map((s) => ({ name: s.name })),
                  },
                  bpm,
                  mood,
                  durationSec,
                },
              }}
              onSaved={() => onSaved?.()}
            />
          ) : (
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Audio guardado en Creaciones · descárgalo desde la pestaña
            </p>
          )}
        </div>
      )}
    </StudioCard>
  );
}

/* ------------------------------------------------------------------ */
/* UI designer (Stitch)                                                */
/* ------------------------------------------------------------------ */

function DesignPanel({ onSaved }: { onSaved?: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [data, setData] = useState<null | { imageUrl: string; htmlUrl: string; projectId: string; screenId: string }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await postJson('/api/tools/design', { prompt }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openInBuilder = async () => {
    if (!data) return;
    try {
      const html = await fetch(data.htmlUrl).then((r) => r.text());
      await navigator.clipboard.writeText(html);
      window.open('/builder', '_blank');
      toast.success('HTML copiado — pégalo en el Builder');
    } catch {
      toast.error('No se pudo copiar el HTML');
    }
  };

  return (
    <StudioCard title="UI designer (Stitch)" icon={LayoutTemplate} glow="glow-video">
      <div className="flex gap-2">
        <input className={inputCls} placeholder="a dashboard with a stats card and a sidebar" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <PanelButton busy={busy} busyLabel="Designing…" disabled={!prompt} onClick={run}>
          Design
        </PanelButton>
      </div>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {data && (
        <div className="mt-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageUrl} alt={prompt} className="w-full rounded-lg border border-border-subtle" />
          <div className="flex flex-wrap gap-2 text-xs">
            <a className={miniBtn} href={data.htmlUrl} target="_blank" rel="noopener noreferrer">
              View HTML
            </a>
            <button type="button" className={miniBtn} onClick={openInBuilder}>
              <FileText className="h-3 w-3" /> Abrir en Builder
            </button>
            <a className={miniBtn} href="https://stitch.withgoogle.com/" target="_blank" rel="noopener noreferrer">
              Open in Stitch
            </a>
          </div>
          <AssetActions
            draft={{
              prompt,
              url: data.imageUrl,
              provider: 'stitch',
              model: 'google-stitch',
              mediaType: 'design',
              meta: { htmlUrl: data.htmlUrl, projectId: data.projectId, screenId: data.screenId },
            }}
            onSaved={() => onSaved?.()}
          />
        </div>
      )}
    </StudioCard>
  );
}

/* ------------------------------------------------------------------ */
/* Multimodal chat                                                     */
/* ------------------------------------------------------------------ */

function ChatPanel({ capabilities }: { capabilities: Cap[] }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, stop, reload } = useChat({
    api: '/api/studio/chat',
    body: { capabilities },
  });

  return (
    <StudioCard title="Multimodal chat" icon={MessageSquare} glow="glow-code">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        Enabled tools: {capabilities.length ? capabilities.join(', ') : 'none'} (chat needs an AI key)
      </p>
      <div className="mb-3 max-h-80 space-y-2.5 overflow-auto pr-1">
        {messages.map((m, i) => (
          <div
            key={m.id}
            style={{ animationDelay: `${Math.min(i * 30, 480)}ms` }}
            className={
              (m.role === 'user'
                ? 'ml-auto max-w-[85%] self-end rounded-xl bg-primary px-3.5 py-2.5 text-sm text-white shadow-[0_6px_24px_-10px_rgba(139,92,246,0.55)]'
                : 'mr-auto max-w-[85%] self-start rounded-xl border border-border-subtle bg-panel px-3.5 py-2.5 text-sm text-neutral-100 shadow-[0_0_18px_-10px_rgba(139,92,246,0.35)]') +
              ' [animation:var(--animate-chat-enter)]'
            }
          >
            {m.content}
            {m.role === 'assistant' && isLoading && i === messages.length - 1 && <span className="stream-caret" />}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-input-active px-3.5 py-2.5">
            <span className="typing-dot" style={{ animationDelay: '0ms' }} />
            <span className="typing-dot" style={{ animationDelay: '150ms' }} />
            <span className="typing-dot" style={{ animationDelay: '300ms' }} />
            <span className="sr-only">Thinking</span>
          </div>
        )}
      </div>
      {error && (
        <p className="mb-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-[11px] text-red-300">
          {error.message || 'Chat failed'}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input className={inputCls} placeholder="Ask the multimodal assistant…" value={input} onChange={handleInputChange} />
        {isLoading && (
          <button type="button" onClick={() => stop()} className={btnCls}>
            <Square className="h-4 w-4" /> Stop
          </button>
        )}
        {error && (
          <button type="button" onClick={() => reload()} className={btnCls}>
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        )}
        {!isLoading && (
          <button type="submit" className={btnCls}>
            <SendHorizontal className="h-4 w-4" /> Send
          </button>
        )}
      </form>
    </StudioCard>
  );
}
