'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Kbd } from '@/components/ui/kbd';
import type { ImageStats } from '@ultraia/core';

// types del dominio growth (no exportados del paquete — wiring diferido, plan loop-67 F4)
type ExperimentVariable = 'titulo' | 'hook' | 'thumbnail' | 'duracion' | 'formato';
type ChannelKpis = Partial<Record<ExperimentVariable, number>>;
type ABExperiment = { id: string; variable: ExperimentVariable; hipotesis: string; control: string; test: string; decisionRule: string };
type PlaybookEntry = { canal: string; recomendacion: string; fuente: ExperimentVariable; peso: number };

type LabProps = {
  sdfHtml: string;
  vfxHtml: string;
  sdfFormula: string;
  vfxName: string;
  imaging: {
    stats: ImageStats;
    edgeDensity: number;
    thresholds: { low: number; high: number };
  };
  growth: {
    kpis: ChannelKpis;
    exps: ABExperiment[];
    avoid: PlaybookEntry[];
    critiques: string[];
  };
};

const VARIABLE_LABEL: Record<ExperimentVariable, string> = {
  titulo: 'Titulo',
  hook: 'Hook',
  thumbnail: 'Thumbnail',
  duracion: 'Duracion',
  formato: 'Formato',
};

const COLOR_TOKENS: [string, string][] = [
  ['canvas', '--color-canvas'],
  ['panel', '--color-panel'],
  ['panel-header', '--color-panel-header'],
  ['panel-hover', '--color-panel-hover'],
  ['input-active', '--color-input-active'],
  ['border-subtle', '--color-border-subtle'],
  ['border-muted', '--color-border-muted'],
  ['border-active', '--color-border-active'],
  ['primary', '--color-primary'],
  ['accent', '--color-accent'],
  ['destructive', '--color-destructive'],
  ['neo-300', '--color-neo-300'],
  ['neo-500', '--color-neo-500'],
  ['neo-700', '--color-neo-700'],
];

const FONT_TOKENS: [string, string][] = [
  ['sans · funcional', '--font-sans'],
  ['display · chat', '--font-display'],
  ['mono · logs', '--font-mono'],
];

function Section({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <section className="glass-panel rounded-xl border border-border-subtle p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[13px] font-semibold text-neutral-200">{title}</h2>
        <span className="rounded border border-border-subtle bg-input-active px-1.5 py-0.5 font-mono text-[10px] text-neutral-500">
          {badge}
        </span>
      </div>
      {children}
    </section>
  );
}

function TokensSection() {
  const [tokens, setTokens] = useState<Record<string, string>>({});

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const read = (v: string) => cs.getPropertyValue(v).trim();
    const all: Record<string, string> = {};
    for (const [, v] of COLOR_TOKENS) all[v] = read(v);
    for (const [, v] of FONT_TOKENS) all[v] = read(v);
    setTokens(all);
  }, []);

  return (
    <Section title="Design Tokens" badge="globals.css">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {COLOR_TOKENS.map(([name, varName]) => (
          <div key={varName} className="rounded-md border border-border-subtle bg-input-active p-2">
            <div
              className="h-8 w-full rounded"
              style={{ background: tokens[varName] || 'transparent' }}
            />
            <p className="mt-1 truncate font-mono text-[10px] text-neutral-400">{name}</p>
            <p className="truncate font-mono text-[10px] text-neutral-600">{tokens[varName] || '…'}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {FONT_TOKENS.map(([name, varName]) => (
          <div
            key={varName}
            className="flex items-center justify-between rounded border border-border-subtle bg-input-active px-2 py-1.5"
          >
            <span className="font-mono text-[11px] text-neutral-400">{name}</span>
            <span className="truncate pl-2 font-mono text-[10px] text-neutral-600">
              {tokens[varName] || '…'}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 font-mono text-[10px] text-neutral-500">
        radio: rounded-lg / rounded-xl / rounded-2xl · dark obsidian + neo violet
      </p>
    </Section>
  );
}

function UiGallery() {
  const [on, setOn] = useState(true);

  return (
    <Section title="UI Kit Gallery" badge="components/ui">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-violet-600/20 text-violet-300">video</Badge>
          <Badge className="bg-cyan-600/20 text-cyan-300">audio</Badge>
          <Badge className="bg-neutral-700/40 text-neutral-300">text</Badge>
          <Badge className="bg-emerald-600/20 text-emerald-300">code</Badge>
          <Badge className="bg-amber-600/20 text-amber-300">web</Badge>
        </div>

        <div className="flex flex-wrap items-stretch gap-3">
          <StatCard label="Conectadas" value={12} hint="de 47 integraciones" />
          <StatCard label="Publicadas" value={8} hint="este mes" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="demo-input">Input</Label>
            <Input id="demo-input" placeholder="Escribe algo…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-area">Textarea</Label>
            <Textarea id="demo-area" placeholder="Prompt…" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={on} onCheckedChange={setOn} label="Toggle demo" />
          <span className="font-mono text-[11px] text-neutral-400">{on ? 'activo' : 'inactivo'}</span>
        </div>

        <Tabs defaultValue="a" className="w-full">
          <TabsList>
            <TabsTrigger value="a">General</TabsTrigger>
            <TabsTrigger value="b">Avance</TabsTrigger>
            <TabsTrigger value="c">Métricas</TabsTrigger>
          </TabsList>
          <TabsContent value="a" className="pt-3 text-[12px] text-neutral-400">
            Contenido de la pestaña General.
          </TabsContent>
          <TabsContent value="b" className="pt-3 text-[12px] text-neutral-400">
            Contenido de la pestaña Avance.
          </TabsContent>
          <TabsContent value="c" className="pt-3 text-[12px] text-neutral-400">
            Contenido de la pestaña Métricas.
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
          <span className="text-[11px] text-neutral-500">atajo de ejemplo</span>
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>

        <EmptyState
          title="Estado vacío"
          description="Ejemplo de EmptyState para listas sin datos."
        />
      </div>
    </Section>
  );
}

type ProtoItem = { id: string; name: string; category: string; ext: string };
type UploadItem = { id: string; name: string; ext: string; url: string };
type CloudItem = { id: string; path: string; name: string; ext: string; mime: string };

const UPLOAD_EXTS = ['.html', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'];

function extOf(name: string): string {
  const m = /\.[a-z0-9]+$/i.exec(name);
  return m ? m[0].toLowerCase() : '';
}

function cloudFileUrl(path: string): string {
  return '/api/cloud/file/' + path.split('/').map(encodeURIComponent).join('/');
}

function tabClass(active: boolean): string {
  return `rounded border px-2 py-1 font-mono text-[10px] ${
    active ? 'border-primary bg-panel-hover text-white' : 'border-border-subtle text-neutral-400'
  }`;
}

function PrototypesSection() {
  const [items, setItems] = useState<ProtoItem[]>([]);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');
  const [tab, setTab] = useState<'fab' | 'mine'>('fab');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [cloudFiles, setCloudFiles] = useState<CloudItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/prototypes')
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (tab !== 'mine') return;
    void refreshCloud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function refreshCloud() {
    try {
      const res = await fetch('/api/cloud/files?base=prototypes');
      if (!res.ok) return;
      const d = await res.json();
      const files: Array<{ path: string; name: string; mime?: string }> = d.files ?? [];
      setCloudFiles(
        files
          .filter((f) => UPLOAD_EXTS.includes(extOf(f.name)))
          .map((f) => ({
            id: f.path,
            path: f.path,
            name: f.name,
            ext: extOf(f.name),
            mime: f.mime ?? '',
          })),
      );
    } catch {
      /* ignore */
    }
  }

  async function persistFile(f: File): Promise<void> {
    const fd = new FormData();
    fd.append('file', f);
    fd.append('dir', 'prototypes');
    const res = await fetch('/api/cloud/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const msg = await res.json().catch(() => ({}));
      setUploadError(msg?.error ?? `error ${res.status}`);
      return;
    }
    await refreshCloud();
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    setUploadError(null);
    const next: UploadItem[] = [];
    for (const f of Array.from(files)) {
      const ext = extOf(f.name);
      if (!UPLOAD_EXTS.includes(ext)) continue;
      next.push({ id: `up-${Date.now()}-${f.name}`, name: f.name, ext, url: URL.createObjectURL(f) });
      void persistFile(f);
    }
    if (next.length) setUploads((u) => [...next, ...u]);
  }

  async function publishTo(channel: string, path: string) {
    const key = `${channel}:${path}`;
    setPublishing(key);
    setPublishStatus((s) => ({ ...s, [key]: 'enviando…' }));
    try {
      const res = await fetch('/api/lab/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, path }),
      });
      const d = await res.json();
      setPublishStatus((s) => ({
        ...s,
        [key]: d.ok ? `✓ publicado${d.url ? ` · ${d.url}` : ''}` : `✗ ${d.error ?? `HTTP ${res.status}`}`,
      }));
    } catch {
      setPublishStatus((s) => ({ ...s, [key]: '✗ red' }));
    } finally {
      setPublishing(null);
    }
  }

  function copyLink(path: string) {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${path.split('/').map(encodeURIComponent).join('/')}`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(path);
        setTimeout(() => setCopied((c) => (c === path ? '' : c)), 1500);
      },
      () => undefined,
    );
  }

  const categories = ['all', ...Array.from(new Set(items.map((i) => i.category)))];
  const q = query.trim().toLowerCase();
  const filtered = items.filter(
    (i) =>
      (cat === 'all' || i.category === cat) &&
      (q === '' || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)),
  );

  function renderTile(name: string, ext: string, embedSrc: string | undefined, rawHref: string | undefined) {
    const isEmbed = ext === '.html' || ext === '.svg';
    const isImg = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
    return (
      <div className="overflow-hidden rounded-lg border border-border-subtle bg-input-active">
        <div className="h-40 bg-black/40">
          {isEmbed ? (
            <iframe title={name} src={embedSrc} sandbox="allow-scripts" className="h-full w-full" />
          ) : isImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={embedSrc} alt={name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-[11px] text-neutral-500">
              {ext}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="truncate font-mono text-[10px] text-neutral-300" title={name}>
            {name}
          </span>
          {!isEmbed && !isImg && rawHref && (
            <a href={rawHref} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline">
              abrir
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <Section title="Prototipos" badge="resultTask/ + tuyos">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setTab('fab')} className={tabClass(tab === 'fab')}>
          Fabricados
        </button>
        <button type="button" onClick={() => setTab('mine')} className={tabClass(tab === 'mine')}>
          Tuyos ({uploads.length + cloudFiles.length})
        </button>
      </div>

      {tab === 'fab' ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar prototipo…"
              className="w-56 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-white outline-none focus:border-violet-500"
            />
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={`rounded border px-2 py-1 font-mono text-[10px] ${
                    cat === c
                      ? 'border-primary bg-panel-hover text-white'
                      : 'border-border-subtle text-neutral-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="font-mono text-[11px] text-neutral-500">
              Sin coincidencias. Genera con{' '}
              <code className="text-neutral-300">node_modules/.bin/vite-node Task/*.ts</code>.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((it) => renderTile(it.name, it.ext, `/api/prototypes/${it.id}`, undefined))}
            </div>
          )}
        </>
      ) : (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`mb-3 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
              dragOver ? 'border-primary bg-panel-hover' : 'border-border-subtle'
            }`}
          >
            <p className="font-mono text-[11px] text-neutral-400">
              Arrastra un archivo (HTML, SVG, PNG, JPG, WEBP, GIF) o
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 rounded border border-primary px-3 py-1 text-[11px] text-primary hover:bg-panel-hover"
            >
              elegir archivo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".html,.svg,.png,.jpg,.jpeg,.webp,.gif"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <p className="mt-2 font-mono text-[10px] text-neutral-600">
              preview instantáneo + se guarda en Cloud (.ultraia/cloud)
            </p>
          </div>

          {uploadError && (
            <p className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 font-mono text-[10px] text-red-300">
              {uploadError}
            </p>
          )}

          {uploads.length > 0 && (
            <>
              <p className="mb-1 font-mono text-[10px] text-neutral-500">En este navegador</p>
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {uploads.map((u) => renderTile(u.name, u.ext, u.url, u.url))}
              </div>
            </>
          )}

          <p className="mb-1 font-mono text-[10px] text-neutral-500">Guardados en Cloud</p>
          {cloudFiles.length === 0 ? (
            <p className="font-mono text-[11px] text-neutral-500">
              Aún no hay diseños guardados. Sube uno y quedará disponible después de refrescar.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cloudFiles.map((c) => {
                const key = `telegram:${c.path}`;
                const keyD = `discord:${c.path}`;
                return (
                  <div key={c.id}>
                    {renderTile(c.name, c.ext, cloudFileUrl(c.path), cloudFileUrl(c.path))}
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="font-mono text-[9px] text-neutral-500">Publicar:</span>
                      <button
                        type="button"
                        disabled={publishing !== null}
                        onClick={() => publishTo('telegram', c.path)}
                        className="rounded border border-border-subtle px-1.5 py-0.5 font-mono text-[9px] text-neutral-300 hover:border-primary hover:text-primary disabled:opacity-40"
                      >
                        telegram
                      </button>
                      <button
                        type="button"
                        disabled={publishing !== null}
                        onClick={() => publishTo('discord', c.path)}
                        className="rounded border border-border-subtle px-1.5 py-0.5 font-mono text-[9px] text-neutral-300 hover:border-primary hover:text-primary disabled:opacity-40"
                      >
                        discord
                      </button>
                      <button
                        type="button"
                        onClick={() => copyLink(c.path)}
                        className="rounded border border-border-subtle px-1.5 py-0.5 font-mono text-[9px] text-neutral-300 hover:border-primary hover:text-primary"
                      >
                        link
                      </button>
                      <span className="font-mono text-[9px] text-neutral-500">
                        {copied === c.path ? '✓' : publishStatus[key] ?? publishStatus[keyD] ?? ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Section>
  );
}

export function LabClient(props: LabProps) {
  const { sdfHtml, vfxHtml, sdfFormula, vfxName, imaging, growth } = props;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="font-display text-xl font-bold text-white">Design Lab — UltraIa</h1>
        <p className="font-mono text-[11px] text-neutral-500">
          sistema de diseño · galería de componentes · prototipos en vivo (keyless, sin GPU ni APIs)
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TokensSection />
        <UiGallery />
      </div>

      <h2 className="pt-2 font-display text-sm font-semibold text-neutral-300">
        Prototipos en vivo — capabilities
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="SDF — ray marching" badge="sdf.ts">
          <iframe
            title="sdf-demo"
            srcDoc={sdfHtml}
            sandbox="allow-scripts"
            className="h-[240px] w-full rounded-md border border-border-subtle bg-input-active"
          />
          <p className="mt-2 truncate font-mono text-[10px] text-neutral-500" title={sdfFormula}>
            {sdfFormula}
          </p>
        </Section>

        <Section title={`CodeVFX — ${vfxName}`} badge="codevfx.ts">
          <iframe
            title="codevfx-demo"
            srcDoc={vfxHtml}
            sandbox="allow-scripts"
            className="h-[240px] w-full rounded-md border border-border-subtle bg-input-active"
          />
          <p className="mt-2 font-mono text-[10px] text-neutral-500">
            canvas puro · GLSL hand-written · hotkey reactiva
          </p>
        </Section>

        <Section title="Imaging — kernels en TS puro" badge="imaging.ts">
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            {(
              [
                ['mean', imaging.stats.mean.toFixed(3)],
                ['stdDev', imaging.stats.stdDev.toFixed(3)],
                ['entropy', imaging.stats.entropy.toFixed(2) + ' bits'],
                ['canny density', (imaging.edgeDensity * 100).toFixed(1) + '%'],
                ['thresholds', `${imaging.thresholds.low.toFixed(2)} / ${imaging.thresholds.high.toFixed(2)}`],
                ['min / max', `${imaging.stats.min.toFixed(2)} / ${imaging.stats.max.toFixed(2)}`],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded border border-border-subtle bg-input-active px-2 py-1.5">
                <span className="text-neutral-500">{k}</span>
                <span className="text-neutral-200">{v}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-neutral-500">
            gradiente radial 96x96 · blur sigma 1.2 · Canny Otsu
          </p>
        </Section>

        <Section title="Growth — loop critiques → experimentos" badge="growth.ts">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {growth.critiques.map((c) => (
              <span key={c} className="rounded border border-border-subtle bg-input-active px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">
                {c}
              </span>
            ))}
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {(Object.keys(growth.kpis) as ExperimentVariable[]).map((v) => (
              <span key={v} className="rounded border border-border-active/40 bg-panel-hover px-2 py-1 font-mono text-[11px] text-neutral-200">
                {VARIABLE_LABEL[v]}: <span className="text-primary">{growth.kpis[v]}</span>
              </span>
            ))}
          </div>
          <ul className="space-y-1.5">
            {growth.exps.map((e) => (
              <li key={e.id} className="rounded border border-border-subtle bg-input-active px-2 py-1.5 font-mono text-[11px]">
                <span className="text-neutral-500">{e.id}</span>{' '}
                <span className="text-neutral-200">{e.test}</span>
              </li>
            ))}
          </ul>
          {growth.avoid.length > 0 && (
            <p className="mt-2 font-mono text-[10px] text-destructive/80">
              evitar: {growth.avoid[0].recomendacion}
            </p>
          )}
        </Section>
      </div>

      <PrototypesSection />
    </div>
  );
}
