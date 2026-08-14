'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Download, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { BuilderElement } from './blocks';
import { generateHtmlCssJs, generateHtmlOnly, generateReactTailwind, slugify } from './codegen';

/* ============================================================
   Modal de exportación: HTML+CSS+JS · React+Tailwind · Fragmento
   ============================================================ */

type TabId = 'standalone' | 'react' | 'fragment';

const TABS: { id: TabId; label: string }[] = [
  { id: 'standalone', label: 'HTML + CSS + JS' },
  { id: 'react', label: 'React + Tailwind' },
  { id: 'fragment', label: 'Fragmento HTML' },
];

const META: Record<TabId, string> = {
  standalone: 'Página autónoma · un solo archivo',
  react: 'Componente funcional · listo para pegar',
  fragment: 'Estilos inline · para cualquier página',
};

function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: filename.endsWith('.tsx') ? 'text/plain;charset=utf-8' : 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportModal({
  open,
  onClose,
  elements,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  elements: BuilderElement[];
  projectName: string;
}) {
  const [tab, setTab] = useState<TabId>('standalone');
  const [copied, setCopied] = useState(false);

  const slug = useMemo(() => slugify(projectName), [projectName]);
  const outputs = useMemo(
    () => ({
      standalone: generateHtmlCssJs(elements, projectName).html,
      react: generateReactTailwind(elements, projectName),
      fragment: generateHtmlOnly(elements),
    }),
    [elements, projectName]
  );

  const code = outputs[tab];
  const filename = tab === 'react' ? `${slug}.tsx` : tab === 'fragment' ? `${slug}-fragment.html` : `${slug}.html`;

  const handleCopy = async () => {
    await copyText(code);
    setCopied(true);
    toast.success('Código copiado al portapapeles');
    setTimeout(() => setCopied(false), 1600);
  };

  const handleDownload = () => {
    downloadFile(filename, code);
    toast.success(`Descargado ${filename}`);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Exportar código" className="max-w-4xl">
      <div className="mb-4 flex items-center gap-1.5 border-b border-border-subtle pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-md px-3 py-1.5 font-mono text-[11px] font-semibold transition-all duration-150',
              tab === t.id
                ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(139,92,246,0.35)]'
                : 'text-neutral-500 hover:bg-panel-hover/50 hover:text-neutral-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate font-mono text-[10px] uppercase tracking-widest text-neutral-600">{META[tab]}</span>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors duration-150',
              copied
                ? 'border-emerald-500/50 text-emerald-400'
                : 'border-border-muted text-neutral-300 hover:border-primary/50 hover:text-primary'
            )}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-mono text-[11px] font-semibold text-white shadow-[0_0_16px_-6px_rgba(139,92,246,0.5)] transition-all duration-150 hover:bg-[#7c3aed] hover:shadow-[0_0_22px_-8px_rgba(139,92,246,0.65)]"
          >
            <Download className="h-3 w-3" />
            Descargar
          </button>
        </div>
      </div>

      <pre className="max-h-[60vh] overflow-auto rounded-xl border border-border-muted bg-input-active p-4 font-mono text-[12px] leading-relaxed text-neutral-300 shadow-[inset_0_2px_10px_rgba(0,0,0,0.45)]">
        {code}
      </pre>

      <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-neutral-600">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70" />
        Generado 100% en tu navegador — no se envía ningún dato.
      </p>
    </Dialog>
  );
}