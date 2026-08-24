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
} from 'lucide-react';
import { MarketingHeader } from '@/components/marketing-header';

type Cap = 'web' | 'image' | 'video' | 'music' | 'design' | 'branding' | 'chat';

const CAP_META: Record<Cap, { label: string; icon: typeof Globe; blurb: string }> = {
  web: { label: 'Web', icon: Globe, blurb: 'Read any public site or social post' },
  image: { label: 'Image', icon: ImageIcon, blurb: 'Generate photoreal images (keyless)' },
  video: { label: 'Video', icon: Clapperboard, blurb: 'Storyboard frames from a prompt' },
  music: { label: 'Music', icon: Music, blurb: 'Compose an original piece' },
  design: { label: 'Design', icon: LayoutTemplate, blurb: 'Generate UI screens (Google Stitch)' },
  branding: { label: 'Branding', icon: Megaphone, blurb: 'On-brand assets + Pomelli' },
  chat: { label: 'Chat', icon: MessageSquare, blurb: 'Multimodal assistant (needs AI key)' },
};

const ALL_CAPS: Cap[] = ['web', 'image', 'video', 'music', 'design', 'branding', 'chat'];

const CONNECTORS = [
  { label: 'Google Flow', href: 'https://labs.google/fx/tools/flow', note: 'Veo video (50 free credits/day)' },
  { label: 'Pomelli', href: 'https://labs.google.com/pomelli', note: 'On-brand marketing (Google Labs)' },
  { label: 'X / Twitter', href: 'https://x.com/explore', note: 'Social listening (public posts)' },
];

async function postJson<T>(url: string, body: unknown, opts?: { timeoutMs?: number }): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 120_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Request failed');
      throw new Error(msg || `Request failed (${res.status})`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

const inputCls =
  'w-full rounded-lg border border-border-muted bg-input-active px-3 py-2.5 text-sm text-neutral-100 outline-none transition-colors duration-150 placeholder:text-neutral-600 focus:border-border-active focus:ring-1 focus:ring-border-active';
const btnCls =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary/85 disabled:opacity-50';

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

export function StudioClient({ user }: { user: { name?: string | null; email: string } }) {
  const [caps, setCaps] = useState<Record<Cap, boolean>>({
    web: true,
    image: true,
    video: true,
    music: true,
    design: true,
    branding: true,
    chat: true,
  });
  const toggle = (c: Cap) => setCaps((p) => ({ ...p, [c]: !p[c] }));
  const activeCaps = ALL_CAPS.filter((c) => caps[c] && c !== 'chat');

  return (
    <div className="min-h-screen">
      <MarketingHeader user={user} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
          Multimodal workspace
        </p>
        <h1 className="mt-1.5 font-display text-[22px] font-bold tracking-tight">
          <span className="gradient-neo-text">Studio</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Combine multiple agents at once — web, image, video, music and chat — in one workspace. Web,
          image, video and music run keyless via free, verified providers.
        </p>

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
                <WebPanel />
              </Panel>
              <Separator className="resize-handle" />
            </>
          )}
          {caps.image && (
            <>
              <Panel minSize={18} className="px-1">
                <ImagePanel />
              </Panel>
              <Separator className="resize-handle" />
            </>
          )}
          {caps.video && (
            <>
              <Panel minSize={18} className="px-1">
                <VideoPanel />
              </Panel>
              <Separator className="resize-handle" />
            </>
          )}
          {caps.music && (
            <>
              <Panel minSize={18} className="px-1">
                <MusicPanel />
              </Panel>
              <Separator className="resize-handle" />
            </>
          )}
          {caps.design && (
            <>
              <Panel minSize={18} className="px-1">
                <DesignPanel />
              </Panel>
              <Separator className="resize-handle" />
            </>
          )}
          {caps.branding && (
            <>
              <Panel minSize={18} className="px-1">
                <BrandingPanel />
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
      </main>
    </div>
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
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
            glow ?? 'border-border-subtle'
          }`}
        >
          <Icon className="h-3.5 w-3.5 text-primary" />
        </span>
        <h2 className="font-display text-[11px] font-semibold tracking-wide text-neutral-200">
          {title}
        </h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function WebPanel() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState<null | {
    title: string | null;
    description: string | null;
    ogImage: string | null;
    text: string;
    finalUrl: string;
  }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await postJson('/api/tools/web', { url }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudioCard title="Web reader" icon={Globe} glow="glow-web">
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <PanelButton busy={busy} busyLabel="Fetching…" disabled={!url} onClick={run}>
          Fetch
        </PanelButton>
      </div>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {data && (
        <div className="mt-3 space-y-2">
          {data.ogImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.ogImage}
              alt={data.title ?? 'Page preview'}
              className="w-full rounded-lg border border-border-subtle"
            />
          )}
          {data.title && <p className="font-display text-sm font-semibold text-neutral-100">{data.title}</p>}
          {data.description && <p className="text-xs text-neutral-500">{data.description}</p>}
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-border-subtle bg-input-active p-3 font-mono text-[11px] leading-relaxed text-neutral-300">
            {data.text}
          </pre>
        </div>
      )}
    </StudioCard>
  );
}

function ImagePanel() {
  const [prompt, setPrompt] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [data, setData] = useState<null | { url: string; model: string; seed: number }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await postJson('/api/tools/image', { prompt, imageUrl: sourceUrl || undefined }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudioCard title="Image generator" icon={ImageIcon} glow="glow-video">
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder="a photoreal sunset over mountains, 35mm"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <PanelButton busy={busy} busyLabel="Generating…" disabled={!prompt} onClick={run}>
          Generate
        </PanelButton>
      </div>
      <input
        className={`${inputCls} mt-2`}
        placeholder="Optional: source image URL to recreate as a photoreal photo"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
      />
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {data && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.url} alt={prompt} className="w-full rounded-lg border border-border-subtle" />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            model: {data.model} Â· seed: {data.seed}
          </p>
        </div>
      )}
    </StudioCard>
  );
}

function VideoPanel() {
  const [prompt, setPrompt] = useState('');
  const [frames, setFrames] = useState(3);
  const [data, setData] = useState<null | { kind: 'storyboard'; frames: { url: string; caption: string }[]; note: string }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await postJson('/api/tools/video', { prompt, frames }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudioCard title="Video storyboard" icon={Clapperboard} glow="glow-video">
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder="a cat walking in the rain, cinematic"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
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
        <div className="mt-3 grid grid-cols-2 gap-2">
          {data.frames.map((f, i) => (
            <figure
              key={i}
              style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
              className="card-glow-hover overflow-hidden rounded-lg border border-border-subtle [animation:var(--animate-chat-enter)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.caption} className="w-full" />
              <figcaption className="p-1.5 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                {f.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </StudioCard>
  );
}

function MusicPanel() {
  const [prompt, setPrompt] = useState('');
  const [data, setData] = useState<null | {
    kind: 'composition';
    title: string;
    mood: string;
    genre: string;
    key: string;
    tempoBpm: number;
    sections: { name: string; description: string; lyrics?: string }[];
    productionNotes: string;
  }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await postJson('/api/tools/music', { prompt }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudioCard title="Music composer" icon={Music} glow="glow-audio">
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder="a calm lo-fi track for focusing"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <PanelButton busy={busy} busyLabel="Composing…" disabled={!prompt} onClick={run}>
          Compose
        </PanelButton>
      </div>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {data && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-display text-sm font-semibold text-neutral-100">{data.title}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            {data.mood} Â· {data.genre} Â· {data.key} Â· {data.tempoBpm} BPM
          </p>
          <ul className="space-y-1">
            {data.sections.map((s, i) => (
              <li
                key={i}
                style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
                className="rounded-lg border border-border-subtle bg-input-active p-2 transition-colors duration-150 hover:border-primary/40 hover:bg-panel-hover [animation:var(--animate-chat-enter)]"
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                  {s.name}
                </span>
                <span className="ml-2 text-xs text-neutral-400">{s.description}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500">{data.productionNotes}</p>
        </div>
      )}
    </StudioCard>
  );
}

function DesignPanel() {
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

  return (
    <StudioCard title="UI designer (Stitch)" icon={LayoutTemplate} glow="glow-video">
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder="a dashboard with a stats card and a sidebar"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <PanelButton busy={busy} busyLabel="Designing…" disabled={!prompt} onClick={run}>
          Design
        </PanelButton>
      </div>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {data && (
        <div className="mt-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageUrl} alt={prompt} className="w-full rounded-lg border border-border-subtle" />
          <div className="flex gap-2 text-xs">
            <a
              className="inline-flex items-center rounded-md border border-border-muted px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-neutral-300 transition-colors duration-150 hover:border-primary/60 hover:text-primary"
              href={data.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View HTML
            </a>
            <a
              className="inline-flex items-center rounded-md border border-border-muted px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-neutral-300 transition-colors duration-150 hover:border-primary/60 hover:text-primary"
              href={`https://stitch.withgoogle.com/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Stitch
            </a>
          </div>
        </div>
      )}
    </StudioCard>
  );
}

function BrandingPanel() {
  const [prompt, setPrompt] = useState('');
  const [data, setData] = useState<null | { url: string }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(
        await postJson('/api/tools/image', {
          prompt: `on-brand, professional product shot: ${prompt}`,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudioCard title="Branding (Pomelli)" icon={Megaphone} glow="glow-video">
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder="on-brand product shot for a coffee brand"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <PanelButton busy={busy} busyLabel="Creating…" disabled={!prompt} onClick={run}>
          Create
        </PanelButton>
      </div>
      <a
        href="https://labs.google.com/pomelli"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-primary transition-colors duration-150 hover:text-primary/85"
      >
        <ExternalLink className="h-3 w-3" /> Open Pomelli (free Google Labs)
      </a>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {data && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.url} alt={prompt} className="w-full rounded-lg border border-border-subtle" />
        </div>
      )}
    </StudioCard>
  );
}

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
            {m.role === 'assistant' && isLoading && i === messages.length - 1 && (
              <span className="stream-caret" />
            )}
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
          <input
            className={inputCls}
            placeholder="Ask the multimodal assistant…"
            value={input}
            onChange={handleInputChange}
          />
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