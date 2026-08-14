'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Save, Sparkles, X, Zap } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  ASPECT_RATIOS,
  PROVIDER_MODELS,
  aspectStyle,
  dimsForAspect,
  enhancePromptLocal,
  type GeneratedResult,
} from './types';

const selectCls =
  'w-full cursor-pointer rounded-lg border border-border-muted bg-input-active px-3 py-2 text-sm text-white outline-none transition-colors duration-150 hover:border-border-active focus:border-primary [&>option]:bg-panel';
const monoLabelCls = 'font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-500';

export function GenerateDrawer({
  open,
  onClose,
  initialPrompt,
  sourcePromptId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initialPrompt?: string;
  sourcePromptId?: string | null;
  onSaved?: () => void;
}) {
  const [basePrompt, setBasePrompt] = useState('');
  const [styleVal, setStyleVal] = useState('');
  const [subjectVal, setSubjectVal] = useState('');
  const [provider, setProvider] = useState<'pollinations' | 'meigen'>('pollinations');
  const [model, setModel] = useState('flux');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBasePrompt(initialPrompt ?? '');
    setStyleVal('');
    setSubjectVal('');
    setProvider('pollinations');
    setModel('flux');
    setAspectRatio('1:1');
    setResult(null);
    setSaved(false);
    setGenerating(false);
    setSaving(false);
  }, [open, initialPrompt]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const hasStyle = basePrompt.includes('[style]');
  const hasSubject = basePrompt.includes('[subject]');

  const effectivePrompt = useMemo(() => {
    let p = basePrompt;
    if (hasStyle && styleVal) p = p.split('[style]').join(styleVal);
    if (hasSubject && subjectVal) p = p.split('[subject]').join(subjectVal);
    return p;
  }, [basePrompt, hasStyle, hasSubject, styleVal, subjectVal]);

  const changeProvider = (p: 'pollinations' | 'meigen') => {
    setProvider(p);
    setModel(PROVIDER_MODELS[p][0]);
  };

  const enhance = () => {
    const improved = enhancePromptLocal(effectivePrompt);
    setBasePrompt(improved);
    setStyleVal('');
    setSubjectVal('');
    toast.success('Prompt mejorado');
  };

  const generate = async () => {
    const prompt = effectivePrompt.trim();
    if (!prompt) {
      toast.error('Escribe un prompt primero');
      return;
    }
    setGenerating(true);
    setResult(null);
    setSaved(false);
    try {
      const body: Record<string, unknown> = { prompt, provider, model };
      if (provider === 'meigen') {
        body.aspectRatio = aspectRatio;
      } else {
        const dims = dimsForAspect(aspectRatio);
        body.width = dims.width;
        body.height = dims.height;
      }
      const res = await fetch('/api/tools/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as GeneratedResult;
      setResult(data);
    } catch {
      toast.error('No se pudo generar la imagen');
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const dims = dimsForAspect(aspectRatio);
      const res = await fetch('/api/library/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: result.prompt,
          url: result.url,
          provider: result.provider,
          model: result.model,
          seed: result.seed || undefined,
          width: result.width || dims.width,
          height: result.height || dims.height,
          sourcePromptId: sourcePromptId || undefined,
        }),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(`API ${res.status}`);
      setSaved(true);
      toast.success('Guardado en Mis creaciones');
      onSaved?.();
    } catch {
      toast.error('No se pudo guardar la imagen');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      toast.success('URL copiada');
    } catch {
      toast.error('No se pudo copiar la URL');
    }
  };

  const variableChipCls =
    'rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary transition-all duration-150 hover:bg-primary/20 hover:shadow-[0_0_12px_-4px_rgba(139,92,246,0.5)]';
  const varInputCls =
    'w-full rounded-lg border border-border-muted bg-input-active px-3 py-2 text-sm text-white outline-none transition-colors duration-150 hover:border-border-active focus:border-primary';

  return (
    <div className={cn('fixed inset-0 z-40', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 [transition-timing-function:var(--ease-ultra)]',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'glass-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col rounded-l-2xl shadow-2xl transition-transform duration-300 [transition-timing-function:var(--ease-ultra)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-border-subtle px-4">
          <div>
            <h2 className="font-display text-[14px] font-semibold text-white">Generar imagen</h2>
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500">
              studio de prompts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1 text-neutral-500 transition-colors duration-150 hover:bg-panel-hover hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className={monoLabelCls}>Prompt</Label>
              <span className="font-mono text-[10px] text-neutral-600">{effectivePrompt.length}</span>
            </div>
            <Textarea
              value={effectivePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              rows={4}
              placeholder="Describe la imagen que quieres generar…"
              className="border-border-muted bg-input-active focus:border-primary"
            />
          </div>

          {(hasStyle || hasSubject) && (
            <div className="space-y-2.5 rounded-xl border border-primary/25 bg-primary/[0.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className={monoLabelCls}>Variables detectadas</p>
              <div className="flex flex-wrap gap-1.5">
                {hasStyle && (
                  <button type="button" className={variableChipCls} onClick={() => document.getElementById('gallery-var-style')?.focus()}>
                    [style]
                  </button>
                )}
                {hasSubject && (
                  <button type="button" className={variableChipCls} onClick={() => document.getElementById('gallery-var-subject')?.focus()}>
                    [subject]
                  </button>
                )}
              </div>
              {hasStyle && (
                <input
                  id="gallery-var-style"
                  value={styleVal}
                  onChange={(e) => setStyleVal(e.target.value)}
                  placeholder="estilo: cinematográfico, editorial…"
                  className={varInputCls}
                />
              )}
              {hasSubject && (
                <input
                  id="gallery-var-subject"
                  value={subjectVal}
                  onChange={(e) => setSubjectVal(e.target.value)}
                  placeholder="sujeto: astronauta, gato…"
                  className={varInputCls}
                />
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className={monoLabelCls}>Proveedor</Label>
            <select
              value={provider}
              onChange={(e) => changeProvider(e.target.value as 'pollinations' | 'meigen')}
              className={selectCls}
            >
              <option value="pollinations">Pollinations (sin clave)</option>
              <option value="meigen">MeiGEN (requiere token)</option>
            </select>
            <p className="font-mono text-[10px] text-neutral-500">
              {provider === 'pollinations'
                ? 'Gratis y keyless · flux / turbo / flux-2'
                : 'Cloud · GPT Image 2, Nanobanana, Midjourney'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className={monoLabelCls}>Modelo</Label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className={selectCls}>
                {PROVIDER_MODELS[provider].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className={monoLabelCls}>Ratio</Label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className={selectCls}
              >
                {ASPECT_RATIOS.map((ar) => (
                  <option key={ar} value={ar}>
                    {ar}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={enhance}
              disabled={!effectivePrompt.trim()}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4" /> Mejorar prompt
            </Button>
            <Button
              onClick={() => void generate()}
              disabled={generating || !effectivePrompt.trim()}
              className="flex-1"
            >
              <Zap className="h-4 w-4" /> {generating ? 'Generando…' : 'Generar'}
            </Button>
          </div>

          {generating && (
            <div className="shimmer relative flex h-72 items-center justify-center overflow-hidden rounded-xl border border-border-muted">
              <span className="relative font-mono text-[11px] uppercase tracking-widest text-neutral-400">
                Generando…
              </span>
            </div>
          )}

          {result && !generating && (
            <div className="space-y-3">
              <div
                className="relative overflow-hidden rounded-xl border border-border-muted shadow-[0_0_32px_-12px_rgba(139,92,246,0.4)]"
                style={aspectStyle(result.aspectRatio)}
              >
                <Image src={result.url} alt={result.prompt} fill sizes="(max-width: 768px) 100vw, 420px" unoptimized className="object-cover" />
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                <span>
                  {result.provider} · {result.model}
                </span>
                <span>{result.aspectRatio}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => void save()}
                  disabled={saved || saving}
                  className="flex-1"
                >
                  <Save className="h-4 w-4" /> {saved ? 'Guardado' : 'Guardar'}
                </Button>
                <Button variant="secondary" onClick={() => void copyUrl()} className="flex-1">
                  <Copy className="h-4 w-4" /> Copiar URL
                </Button>
                <a
                  href={result.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-muted px-4 py-2.5 text-sm font-semibold text-neutral-200 transition-all duration-150 hover:border-primary/50 hover:bg-panel-hover hover:text-primary"
                >
                  <Download className="h-4 w-4" /> Descargar
                </a>
              </div>
            </div>
          )}

          {!result && !generating && (
            <p className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.04] p-4 font-mono text-[11px] leading-relaxed text-neutral-500">
              El resultado aparece aquí. Pollinations es gratuito y sin clave; MeiGEN usa modelos cloud
              premium y requiere token configurado en el servidor.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}