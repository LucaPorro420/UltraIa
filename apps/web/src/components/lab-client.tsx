'use client';

import { useEffect, useState } from 'react';
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
    </div>
  );
}
