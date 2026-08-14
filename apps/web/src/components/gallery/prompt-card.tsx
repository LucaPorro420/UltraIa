'use client';

import Image from 'next/image';
import { Eye, Heart, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { aspectStyle, type PromptItem } from './types';

export function PromptCard({
  item,
  onToggleFavorite,
  onDetail,
  onUse,
}: {
  item: PromptItem;
  onToggleFavorite: (item: PromptItem) => void;
  onDetail: (item: PromptItem) => void;
  onUse: (item: PromptItem) => void;
}) {
  return (
    <div className="card-glow-hover group overflow-hidden rounded-xl border border-border-subtle bg-panel">
      <div className="relative overflow-hidden" style={aspectStyle(item.aspectRatio)}>
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.prompt}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            unoptimized
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-panel-header via-panel to-panel-hover">
            <span className="font-mono text-[28px] font-bold uppercase text-neutral-600">
              {item.category.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/70">
            {item.aspectRatio}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              title={item.isFavorite ? 'Quitar favorito' : 'Añadir favorito'}
              aria-pressed={item.isFavorite}
              onClick={() => onToggleFavorite(item)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/50 backdrop-blur-sm transition-all duration-150 hover:border-primary hover:bg-black/70',
                item.isFavorite && 'shadow-[0_0_14px_-4px_rgba(244,114,182,0.6)]',
              )}
            >
              <Heart
                className={cn('h-4 w-4', item.isFavorite ? 'fill-accent text-accent' : 'text-white')}
              />
            </button>
            <button
              type="button"
              title="Ver detalle"
              onClick={() => onDetail(item)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/50 backdrop-blur-sm transition-colors duration-150 hover:border-primary hover:bg-black/70"
            >
              <Eye className="h-4 w-4 text-white" />
            </button>
            <button
              type="button"
              title="Usar idea"
              onClick={() => onUse(item)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/50 backdrop-blur-sm transition-colors duration-150 hover:border-primary hover:bg-black/70"
            >
              <Zap className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-border-subtle p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
            {item.category}
          </span>
          <span className="font-mono text-[10px] text-neutral-500">{item.useCount} usos</span>
        </div>
        <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-neutral-300">{item.prompt}</p>
      </div>
    </div>
  );
}