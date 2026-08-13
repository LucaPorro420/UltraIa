'use client';

import { useState } from 'react';
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
  Loader2,
  SendHorizontal,
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

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => 'Request failed');
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const inputCls =
  'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500';
const btnCls =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50';

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
        <h1 className="text-3xl font-bold tracking-tight">Studio</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Combine multiple agents at once â€” web, image, video, music and chat â€” in one workspace. Web,
          image, video and music run keyless via free, verified providers.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {ALL_CAPS.map((c) => {
            const Icon = CAP_META[c].icon;
            const on = caps[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                aria-pressed={on}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  on
                    ? 'border-violet-500 bg-violet-600/20 text-violet-200'
                    : 'border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {CAP_META[c].label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 text-xs">
          <span className="text-neutral-500">Free external connectors:</span>
          {CONNECTORS.map((c) => (
            <a
              key={c.href}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full border border-neutral-700 px-3 py-1 text-neutral-300 transition-colors hover:border-violet-500 hover:text-white"
            >
              {c.label}
              <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>

        <Group orientation="horizontal" className="mt-10">
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
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 ${glow ?? ''}`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-neutral-300">{title}</h2>
      </div>
      {children}
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
        <button className={btnCls} disabled={busy || !url} onClick={run}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {data && (
        <div className="mt-3 space-y-2">
          {data.ogImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.ogImage} alt={data.title ?? 'Page preview'} className="w-full rounded-lg border border-neutral-800" />
          )}
          {data.title && <p className="text-sm font-medium text-neutral-100">{data.title}</p>}
          {data.description && <p className="text-xs text-neutral-400">{data.description}</p>}
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">
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
        <button className={btnCls} disabled={busy || !prompt} onClick={run}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
        </button>
      </div>
      <input
        className={`${inputCls} mt-2`}
        placeholder="Optional: source image URL to recreate as a photoreal photo"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
      />
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {data && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.url} alt={prompt} className="w-full rounded-lg border border-neutral-800" />
          <p className="mt-2 text-xs text-neutral-500">
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
          className="w-16 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-2.5 text-sm text-white outline-none focus:border-violet-500"
        />
        <button className={btnCls} disabled={busy || !prompt} onClick={run}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Render'}
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {data && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {data.frames.map((f, i) => (
            <figure key={i} className="overflow-hidden rounded-lg border border-neutral-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.caption} className="w-full" />
              <figcaption className="p-1.5 text-[11px] text-neutral-500">{f.caption}</figcaption>
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
        <button className={btnCls} disabled={busy || !prompt} onClick={run}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Compose'}
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {data && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium text-neutral-100">{data.title}</p>
          <p className="text-xs text-neutral-400">
            {data.mood} Â· {data.genre} Â· {data.key} Â· {data.tempoBpm} BPM
          </p>
          <ul className="space-y-1">
            {data.sections.map((s, i) => (
              <li key={i} className="rounded-lg border border-neutral-800 bg-neutral-950 p-2">
                <span className="text-xs font-semibold text-violet-300">{s.name}</span>
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
        <button className={btnCls} disabled={busy || !prompt} onClick={run}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Design'}
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {data && (
        <div className="mt-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageUrl} alt={prompt} className="w-full rounded-lg border border-neutral-800" />
          <div className="flex gap-3 text-xs">
            <a className="text-violet-300 hover:underline" href={data.htmlUrl} target="_blank" rel="noopener noreferrer">
              View HTML
            </a>
            <a
              className="text-violet-300 hover:underline"
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
        <button className={btnCls} disabled={busy || !prompt} onClick={run}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
        </button>
      </div>
      <a
        href="https://labs.google.com/pomelli"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Open Pomelli (free Google Labs)
      </a>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {data && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.url} alt={prompt} className="w-full rounded-lg border border-neutral-800" />
        </div>
      )}
    </StudioCard>
  );
}

function ChatPanel({ capabilities }: { capabilities: Cap[] }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/studio/chat',
    body: { capabilities },
  });

  return (
    <StudioCard title="Multimodal chat" icon={MessageSquare} glow="glow-code">
      <p className="mb-3 text-xs text-neutral-500">
        Enabled tools: {capabilities.length ? capabilities.join(', ') : 'none'} (chat needs an AI key)
      </p>
      <div className="mb-3 max-h-72 space-y-3 overflow-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'user'
                ? 'ml-auto max-w-[85%] self-end rounded-2xl bg-violet-700/80 px-4 py-3 text-sm text-white'
                : 'mr-auto max-w-[85%] self-start rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100'
            }
          >
            {m.content}
          </div>
        ))}
        {isLoading && <p className="text-xs text-neutral-500">Thinkingâ€¦</p>}
      </div>
      {error && (
        <p className="mb-2 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-300">
          {(error.message || 'Chat failed') + ' â€” set OPENAI_API_KEY to enable.'}
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2"
      >
        <input
          className={inputCls}
          placeholder="Ask the multimodal assistantâ€¦"
          value={input}
          onChange={handleInputChange}
        />
        <button type="submit" disabled={isLoading} className={btnCls}>
          <SendHorizontal className="h-4 w-4" /> Send
        </button>
      </form>
    </StudioCard>
  );
}
