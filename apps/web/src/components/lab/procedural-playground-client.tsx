'use client';
import { useEffect, useState } from 'react';

type Kind = 'fbm' | 'perlin' | 'simplex' | 'worley' | 'mandelbrot' | 'fbm-flow';

const KINDS: { id: Kind; label: string }[] = [
  { id: 'fbm', label: 'FBM (fractal)' },
  { id: 'perlin', label: 'Perlin' },
  { id: 'simplex', label: 'Simplex' },
  { id: 'worley', label: 'Worley' },
  { id: 'mandelbrot', label: 'Mandelbrot' },
  { id: 'fbm-flow', label: 'FBM Flow (anim)' },
];

export function ProceduralPlaygroundClient({ palettes }: { palettes: string[] }) {
  const [kind, setKind] = useState<Kind>('fbm');
  const [palette, setPalette] = useState<string>(palettes[0] ?? 'neoViolet');
  const [seed, setSeed] = useState<number>(1337);
  const [size, setSize] = useState<number>(384);
  const [format, setFormat] = useState<'frames' | 'gif'>('frames');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[] | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [resultType, setResultType] = useState<string>('');

  useEffect(() => {
    if (!frames || frames.length === 0) return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % frames.length;
      setFrameIdx(i);
    }, 1000 / 12);
    return () => clearInterval(id);
  }, [frames]);

  async function generate() {
    setLoading(true);
    setError(null);
    setImage(null);
    setFrames(null);
    setMeta(null);
    setResultType('');
    try {
      const res = await fetch('/api/procedural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, palette, seed, format, width: size, height: Math.round(size * 0.66) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'error');
        return;
      }
      if (data.type === 'frames') {
        setFrames(data.frames as string[]);
        setFrameIdx(0);
      } else {
        setImage(data.dataUrl as string);
      }
      setResultType(data.type as string);
      setMeta(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#e7e7ee]">Lab · Procedural</h1>
        <p className="mt-1 text-sm text-[#9a9aae]">
          Genera campos escalares (Perlin/FBM/Simplex/Worley/Mandelbrot) y animaciones procedurales
          directamente desde matematicas puras - determinista y keyless.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <aside className="space-y-5 rounded-xl border border-[#1f1f2a] bg-[#111115] p-4">
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9a9aae]">Tipo</div>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setKind(k.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    kind === k.id
                      ? 'bg-[#8b5cf6] text-white'
                      : 'border border-[#26263a] bg-[#0c0c10] text-[#c7c7d6] hover:border-[#3a3a52]'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {kind === 'fbm-flow' && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9a9aae]">Formato</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormat('frames')}
                  className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    format === 'frames'
                      ? 'bg-[#8b5cf6] text-white'
                      : 'border border-[#26263a] bg-[#0c0c10] text-[#c7c7d6] hover:border-[#3a3a52]'
                  }`}
                >
                  Frames
                </button>
                <button
                  onClick={() => setFormat('gif')}
                  className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    format === 'gif'
                      ? 'bg-[#8b5cf6] text-white'
                      : 'border border-[#26263a] bg-[#0c0c10] text-[#c7c7d6] hover:border-[#3a3a52]'
                  }`}
                >
                  GIF
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#9a9aae]">Paleta</label>
            <select
              value={palette}
              onChange={(e) => setPalette(e.target.value)}
              className="w-full rounded-lg border border-[#26263a] bg-[#0c0c10] px-2 py-1.5 text-sm text-[#e7e7ee]"
            >
              {palettes.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#9a9aae]">Semilla</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-[#26263a] bg-[#0c0c10] px-2 py-1.5 text-sm text-[#e7e7ee]"
              />
              <button
                onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
                className="rounded-lg border border-[#26263a] bg-[#0c0c10] px-2 text-xs text-[#c7c7d6] hover:border-[#3a3a52]"
                title="Semilla aleatoria"
              >DADO</button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#9a9aae]">Tamano ({size}px)</label>
            <input
              type="range"
              min={128}
              max={768}
              step={32}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-[#8b5cf6]"
            />
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="w-full rounded-lg bg-[#8b5cf6] py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Generando...' : 'Generar'}
          </button>
        </aside>

        <main className="rounded-xl border border-[#1f1f2a] bg-[#111115] p-4">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
          )}

          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-[#26263a] bg-[#0c0c10] p-4">
            {loading && <span className="text-sm text-[#9a9aae]">Calculando pixeles...</span>}
            {!loading && image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="procedural" className="max-h-[480px] rounded-md" />
            )}
            {!loading && frames && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={frames[frameIdx]} alt="procedural-anim" className="max-h-[480px] rounded-md" />
            )}
            {!loading && !image && !frames && (
              <span className="text-sm text-[#6b6b80]">Elige opciones y pulsa Generar.</span>
            )}
          </div>

          {meta && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#9a9aae]">
              {Object.entries(meta)
                .filter(([k]) => k !== 'dataUrl' && k !== 'frames')
                .map(([k, v]) => (
                  <span key={k} className="rounded-md bg-[#0c0c10] px-2 py-1">
                    {k}: <span className="text-[#e7e7ee]">{String(v)}</span>
                  </span>
                ))}
            </div>
          )}

          {image && (
            <a
              href={image}
              download={`procedural-${meta?.seed ?? 'x'}.${resultType === 'gif' ? 'gif' : 'png'}`}
              className="mt-3 inline-block text-xs text-[#8b5cf6] hover:underline"
            >
              Descargar {resultType === 'gif' ? 'GIF' : 'PNG'}
            </a>
          )}
        </main>
      </div>
    </div>
  );
}
