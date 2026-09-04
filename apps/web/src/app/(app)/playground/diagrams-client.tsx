'use client';

import { useState, useRef } from 'react';

/**
 * Interactive diagram generator.
 * Creates SVG diagrams from user-defined steps/nodes.
 */

type DiagramKind = 'timeline' | 'data-flow' | 'architecture' | 'loop';

interface Step {
  id: string;
  label: string;
  description?: string;
}

const KINDS: { id: DiagramKind; label: string; desc: string }[] = [
  { id: 'timeline', label: 'Timeline', desc: 'Pasos secuenciales en el tiempo' },
  { id: 'data-flow', label: 'Data Flow', desc: 'Flujo de datos entre componentes' },
  { id: 'architecture', label: 'Architecture', desc: 'Arquitectura de sistema' },
  { id: 'loop', label: 'Loop', desc: 'Bucle iterativo con condiciones' },
];

const PRESET_STEPS: Record<DiagramKind, Step[]> = {
  timeline: [
    { id: '1', label: 'Plan', description: 'Definir objetivos' },
    { id: '2', label: 'Build', description: 'Implementar solucion' },
    { id: '3', label: 'Test', description: 'Verificar calidad' },
    { id: '4', label: 'Deploy', description: 'Lanzar a produccion' },
  ],
  'data-flow': [
    { id: 'input', label: 'Input', description: 'Datos de entrada' },
    { id: 'process', label: 'Process', description: 'Transformacion' },
    { id: 'validate', label: 'Validate', description: 'Verificacion' },
    { id: 'output', label: 'Output', description: 'Resultado' },
  ],
  architecture: [
    { id: 'client', label: 'Client', description: 'Frontend' },
    { id: 'api', label: 'API', description: 'Backend' },
    { id: 'db', label: 'Database', description: 'Persistencia' },
    { id: 'cache', label: 'Cache', description: 'Optimizacion' },
  ],
  loop: [
    { id: 'sense', label: 'Sense', description: 'Leer estado' },
    { id: 'reason', label: 'Reason', description: 'Decidir accion' },
    { id: 'act', label: 'Act', description: 'Ejecutar' },
    { id: 'check', label: 'Check', description: 'Verificar resultado' },
  ],
};

function generateTimelineSvg(steps: Step[], color: string): string {
  const w = 800;
  const h = 200;
  const padding = 60;
  const stepW = (w - padding * 2) / Math.max(steps.length - 1, 1);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`;
  svg += `<rect width="${w}" height="${h}" fill="#0c0c10"/>`;

  // Line
  svg += `<line x1="${padding}" y1="100" x2="${w - padding}" y2="100" stroke="${color}44" stroke-width="2"/>`;

  steps.forEach((step, i) => {
    const x = padding + i * stepW;
    // Circle
    svg += `<circle cx="${x}" cy="100" r="16" fill="${color}" stroke="#0c0c10" stroke-width="3"/>`;
    svg += `<text x="${x}" y="105" text-anchor="middle" fill="#fff" font-size="12" font-family="monospace">${i + 1}</text>`;
    // Label
    svg += `<text x="${x}" y="70" text-anchor="middle" fill="#e7e7ee" font-size="13" font-weight="600" font-family="sans-serif">${step.label}</text>`;
    if (step.description) {
      svg += `<text x="${x}" y="145" text-anchor="middle" fill="#9a9aae" font-size="11" font-family="sans-serif">${step.description}</text>`;
    }
    // Arrow (except last)
    if (i < steps.length - 1) {
      const nx = padding + (i + 1) * stepW;
      svg += `<polygon points="${nx - 20},95 ${nx - 8},100 ${nx - 20},105" fill="${color}88"/>`;
    }
  });

  svg += '</svg>';
  return svg;
}

function generateFlowSvg(steps: Step[], color: string): string {
  const w = 800;
  const h = 200;
  const padding = 80;
  const stepW = (w - padding * 2) / Math.max(steps.length, 1);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`;
  svg += `<rect width="${w}" height="${h}" fill="#0c0c10"/>`;

  steps.forEach((step, i) => {
    const x = padding + i * stepW + stepW / 2;
    const boxW = stepW * 0.7;
    const boxH = 50;
    // Box
    svg += `<rect x="${x - boxW / 2}" y="75" width="${boxW}" height="${boxH}" rx="8" fill="#111115" stroke="${color}" stroke-width="1.5"/>`;
    svg += `<text x="${x}" y="100" text-anchor="middle" fill="#e7e7ee" font-size="12" font-weight="600" font-family="sans-serif">${step.label}</text>`;
    if (step.description) {
      svg += `<text x="${x}" y="115" text-anchor="middle" fill="#9a9aae" font-size="10" font-family="sans-serif">${step.description}</text>`;
    }
    // Arrow
    if (i < steps.length - 1) {
      const nx = padding + (i + 1) * stepW + stepW / 2;
      svg += `<line x1="${x + boxW / 2 + 4}" y1="100" x2="${nx - boxW / 2 - 4}" y2="100" stroke="${color}66" stroke-width="1.5"/>`;
      svg += `<polygon points="${nx - boxW / 2 - 8},96 ${nx - boxW / 2 - 2},100 ${nx - boxW / 2 - 8},104" fill="${color}88"/>`;
    }
  });

  svg += '</svg>';
  return svg;
}

export function DiagramsClient() {
  const [kind, setKind] = useState<DiagramKind>('timeline');
  const [steps, setSteps] = useState<Step[]>(PRESET_STEPS.timeline);
  const [color, setColor] = useState('#8b5cf6');
  const [newLabel, setNewLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  function addStep() {
    if (!newLabel.trim()) return;
    setSteps([...steps, { id: String(steps.length + 1), label: newLabel.trim() }]);
    setNewLabel('');
  }

  function removeStep(id: string) {
    setSteps(steps.filter((s) => s.id !== id));
  }

  function changeKind(k: DiagramKind) {
    setKind(k);
    setSteps(PRESET_STEPS[k]);
  }

  /** L02 FIX: Strip script tags and on* event handlers from SVG before injection. */
  function sanitizeSvg(svg: string): string {
    return svg
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  }

  function generateSvg(): string {
    if (kind === 'timeline') return sanitizeSvg(generateTimelineSvg(steps, color));
    return sanitizeSvg(generateFlowSvg(steps, color));
  }

  function exportSvg() {
    const svg = generateSvg();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = `diagram-${kind}-${Date.now()}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportPng() {
    const svg = generateSvg();
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `diagram-${kind}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

  const inputCls = 'w-full rounded-lg border border-[#26263a] bg-[#0c0c10] px-2 py-1.5 text-sm text-[#e7e7ee]';
  const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wide text-[#9a9aae]';

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]">
      {/* Diagram preview */}
      <div className="flex flex-col items-center" ref={containerRef}>
        <div
          className="w-full overflow-auto rounded-lg border border-[#26263a] bg-[#0c0c10]"
          dangerouslySetInnerHTML={{ __html: generateSvg() }}
        />
        <div className="mt-3 flex gap-2">
          <button onClick={exportPng} className="rounded-lg border border-[#26263a] bg-[#0c0c10] px-3 py-1.5 text-xs text-[#c7c7d6] hover:border-[#3a3a52]">
            Export PNG
          </button>
          <button onClick={exportSvg} className="rounded-lg border border-[#26263a] bg-[#0c0c10] px-3 py-1.5 text-xs text-[#c7c7d6] hover:border-[#3a3a52]">
            Export SVG
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Kind selector */}
        <div>
          <label className={labelCls}>Tipo de diagrama</label>
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => changeKind(k.id)}
                className={`rounded-md px-2 py-1 text-xs transition-colors ${
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

        {/* Color */}
        <div>
          <label className={labelCls}>Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-full cursor-pointer rounded-lg border border-[#26263a] bg-[#0c0c10]" />
        </div>

        {/* Steps */}
        <div>
          <label className={labelCls}>Pasos ({steps.length})</label>
          <div className="space-y-1.5">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                <span className="w-5 text-center text-xs text-[#6b6b80]">{i + 1}</span>
                <span className="flex-1 truncate text-sm text-[#e7e7ee]">{step.label}</span>
                <button onClick={() => removeStep(step.id)} className="text-xs text-[#6b6b80] hover:text-red-400">x</button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStep()}
              placeholder="Nuevo paso..."
              className={inputCls}
            />
            <button onClick={addStep} className="rounded-lg bg-[#8b5cf6] px-3 py-1.5 text-xs text-white hover:opacity-90">+</button>
          </div>
        </div>

        {/* SVG source */}
        <div>
          <label className={labelCls}>SVG Source</label>
          <pre className="max-h-32 overflow-auto rounded-lg border border-[#26263a] bg-[#0c0c10] p-2 text-[10px] text-[#9a9aae]">
            {generateSvg().slice(0, 500)}...
          </pre>
        </div>
      </div>
    </div>
  );
}
