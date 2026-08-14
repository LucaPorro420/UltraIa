'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ASPECT_RATIOS, CATEGORIES } from './types';

const selectCls =
  'w-full cursor-pointer rounded-lg border border-border-muted bg-input-active px-3 py-2 text-sm text-white outline-none transition-colors duration-150 hover:border-border-active focus:border-primary [&>option]:bg-panel';
const monoLabelCls = 'font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-500';

export function ContributeDialog({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Custom');
  const [tags, setTags] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setPrompt('');
    setTags('');
    setImageUrl('');
    setCategory('Custom');
    setAspectRatio('1:1');
    setError(null);
  };

  const submit = async () => {
    const p = prompt.trim();
    if (p.length < 20) {
      setError('El prompt debe tener al menos 20 caracteres');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/library/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: p,
          category,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 6),
          aspectRatio,
          imageUrl: imageUrl.trim() || undefined,
        }),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(`API ${res.status}`);
      toast.success('Prompt publicado en la galería');
      reset();
      onSubmitted();
      onClose();
    } catch {
      toast.error('No se pudo publicar el prompt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Plus className="h-3.5 w-3.5 text-primary" />
          Contribuir prompt
        </span>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className={monoLabelCls}>Prompt</Label>
            <span className="font-mono text-[10px] text-neutral-600">{prompt.length}/4000</span>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Escribe un prompt de imagen reutilizable (mínimo 20 caracteres)…"
            className="border-border-muted bg-input-active transition-colors duration-150 hover:border-border-active focus:border-primary"
          />
          {error && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-destructive">{error}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className={monoLabelCls}>Categoría</Label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
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

        <div className="space-y-1.5">
          <Label className={monoLabelCls}>Tags (separados por coma)</Label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="cinematic, portrait, neon…"
            className="border-border-muted bg-input-active transition-colors duration-150 hover:border-border-active focus:border-primary"
          />
        </div>

        <div className="space-y-1.5">
          <Label className={monoLabelCls}>Imagen de referencia (URL, opcional)</Label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            className="border-border-muted bg-input-active transition-colors duration-150 hover:border-border-active focus:border-primary"
          />
        </div>

        <div className="flex gap-2 border-t border-border-subtle pt-4">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={submitting} className="flex-1">
            {submitting ? 'Publicando…' : 'Publicar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}