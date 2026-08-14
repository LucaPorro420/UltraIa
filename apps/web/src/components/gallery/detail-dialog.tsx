'use client';

import { Copy, ExternalLink, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { aspectStyle, parseList, type PromptItem } from './types';

export function DetailDialog({
  item,
  sourcePromptId,
  onClose,
  onUse,
}: {
  item: PromptItem | null;
  sourcePromptId?: string | null;
  onClose: () => void;
  onUse: (item: PromptItem, sourcePromptId: string | null) => void;
}) {
  if (!item) return null;
  const tags = parseList(item.tags);
  const models = parseList(item.models);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.prompt);
      toast.success('Prompt copiado');
    } catch {
      toast.error('No se pudo copiar el prompt');
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {item.category}
          <span className="font-mono text-[10px] font-normal uppercase tracking-widest text-neutral-500">
            #{item.id.slice(0, 8)}
          </span>
        </span>
      }
    >
      <div className="space-y-4">
        {item.imageUrl && (
          <div
            className="overflow-hidden rounded-xl border border-border-muted shadow-[0_10px_36px_-18px_rgba(0,0,0,0.9)]"
            style={aspectStyle(item.aspectRatio)}
          >
            <img src={item.imageUrl} alt={item.prompt} className="h-full w-full object-cover" />
          </div>
        )}

        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-neutral-200">
          {item.prompt}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded border border-border-subtle bg-panel-header px-2 py-0.5 font-mono text-[10px] text-neutral-400 transition-colors duration-150 hover:border-primary/40 hover:text-neutral-200"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {models.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {models.map((m) => (
              <Badge
                key={m}
                className="border border-primary/40 bg-primary/10 font-mono text-[10px] text-primary"
              >
                {m}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-4 border-t border-border-subtle pt-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          <span>Ratio {item.aspectRatio}</span>
          <span>Rank {item.engagementRank}</span>
          <span>{item.useCount} usos</span>
          {item.isUserSubmitted && <span>Comunidad</span>}
        </div>

        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-primary transition-colors duration-150 hover:text-accent"
          >
            Fuente original <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <div className="flex gap-2 border-t border-border-subtle pt-4">
          <Button variant="secondary" onClick={() => void copy()} className="flex-1">
            <Copy className="h-4 w-4" /> Copiar prompt
          </Button>
          <Button onClick={() => onUse(item, sourcePromptId ?? item.id)} className="flex-1">
            <Zap className="h-4 w-4" /> Usar idea
          </Button>
        </div>
      </div>
    </Dialog>
  );
}