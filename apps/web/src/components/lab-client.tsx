'use client';

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

export function LabClient(props: LabProps) {
  const { sdfHtml, vfxHtml, sdfFormula, vfxName, imaging, growth } = props;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="font-display text-xl font-bold text-white">Laboratorio de capabilities</h1>
        <p className="font-mono text-[11px] text-neutral-500">
          demos deterministas keyless · dominio puro en el server · sin GPU ni APIs
        </p>
      </header>

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